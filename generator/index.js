const raylib = require('@raylib/api')
const { fstat } = require('fs')
const path = require('path')
const fs = require('fs')

// Where to write the file to.
const outputFile = path.join(__dirname, '..', 'include', 'raylib-umka.h')

/**
 * Translates raylib parameters into umka values.
 */
function buildParamType(param, key) {
    switch (param.type) {
        case 'float':
            return `params[${key}].real32Val`
        case 'double':
            return `params[${key}].realVal`
        case 'unsigned int':
        case 'char':
        case 'unsigned char':
        case 'unsigned long long':
        case 'unsigned long':
            return `params[${key}].uintVal`
        case 'int':
        case 'long':
            return `params[${key}].intVal`
        case 'bool':
            return `(bool)params[${key}].intVal`
        case 'const Vector3':
            return `(Vector3*)&params[${key}]`
    }

    return `(${param.type})params[${key}].ptrVal`
}

/**
 * Sees whether the given type is a reserved raylib type.
 *
 * TODO: Have getIsRaylibStruct be dynamic?
 */
function getIsRaylibStruct(type) {
    return [
        'rlRenderBatch',
        'Color',
        'Vector2',
        'Vector3',
        'const Vector3',
        'Vector4',
        'Quaternion',
        'Matrix',
        'Color',
        'Rectangle',
        'Texture2D',
        'TextureCubemap',
        'Image',
        'Texture',
        'RenderTexture',
        'RenderTexture2D',
        'NPatchInfo',
        'GlyphInfo',
        'Font',
        'Camera',
        'Camera3D',
        'Camera2D',
        'Mesh',
        'Shader',
        'MaterialMap',
        'Material',
        'Transform',
        'BoneInfo',
        'Model',
        'ModelAnimation',
        'Ray',
        'RayCollision',
        'BoundingBox',
        'Wave',
        'AudioStream',
        'Sound',
        'Music',
        'VrDeviceInfo',
        'VrStereoConfig',
        'FilePathList',
        'rAudioProcessor',
        'float3',
        'float16'
    ].includes(type)
}

/**
 * Handles how to format the umka return values from raylib numbers.
 */
function buildFunctionReturn(func) {
    switch (func.returnType) {
        case 'bool':
            return [`result->intVal = (int)`, '']
        case 'int':
            return [`result->intVal = `, '']
        case 'unsigned int':
        case 'unsigned long long':
        case 'unsigned long':
            return [`result->uintVal = `, '']
        case 'long':
            return [`result->intVal = `, '']
        case 'float':
            return [`result->realVal = `, '']
        case 'double':
            return ['result->realVal = ', '']
        case 'void':
            return ['', '']
    }

    if (func.returnType.endsWith('*')) {
        return ['result->ptrVal = (void*)', '']
    }

    if (getIsRaylibStruct(func.returnType)) {
        return [
            `result->ptrVal = umkaAllocData(result->ptrVal, sizeof(${func.returnType}), NULL);\n    ${func.returnType} out = `,
            `\n    RAYLIB_UMKA_MEMCPY(result->ptrVal, &out, sizeof(${func.returnType}));`
        ]
    }

    return [`/* TODO: Unknown type ${func.returnType} */`, '']
}

/**
 * The blacklist of functions that will be ignored.
 */
const functionBlackList = [
    'TextFormat',
    'TraceLog',
    'SetTraceLogCallback',
    'SetLoadFileDataCallback',
    'SetSaveFileDataCallback',
    'SetLoadFileTextCallback',
    'SetSaveFileTextCallback',
    'LoadFontData',
    'SetAudioStreamCallback',
    'AttachAudioStreamProcessor',
    'DetachAudioStreamProcessor',
    'rlEnableStatePointer',
    'rlDisableStatePointer',
    'rlLoadRenderBatch',
    'rlUnloadRenderBatch',
    'rlDrawRenderBatch',
    'rlSetRenderBatchActive',
    //'rlSetVertexAttribute', // "type" is a reserved name in umka?
]

/**
 * Builds the umka function binding implementations.
 */
function getFunctionImplementations(functions) {
    let output = ''
    for (let func of functions) {
        // Blaklist
        if (functionBlackList.includes(func.name)) {
            output += `// Function ${func.name}() skipped\n\n`
            continue
        }

        // Function Declaration
        output += `/**
 * Umka bindings for ${func.name}().
 *
 * @see ${func.name}()
 */
void umka${func.name}(UmkaStackSlot *params, UmkaStackSlot *result) {\n`
        let params = []
        let paramsInFunction = []
        if (func.params) {
            // Params
            let last = func.params.length - 1;

            // Functions that return a struct have a parameter of [0] as their filename.
            // Given that, offset the last parameter index by 1.
            // See: https://github.com/vtereshkov/umka-lang/issues/221
            if (getIsRaylibStruct(func.returnType)) {
                output += `    // Skipping params[0], as it's a reference to Umka's internal filename\n`
                last++;
            }

            for (let param of func.params) {
                if (getIsRaylibStruct(param.type)) {
                    output += `    ${param.type}* ${param.name} = (${param.type}*)&params[${last--}];\n`
                    paramsInFunction.push('*' + param.name)
                }
                else {
                    output += `    ${param.type} ${param.name} = ${buildParamType(param, last--)};\n`
                    paramsInFunction.push(param.name)
                }
            }
        }

        // Call the function
        const [returnVal, returnValAfter] = buildFunctionReturn(func)
        output += `    ${returnVal}${func.name}(${paramsInFunction.join(', ')});${returnValAfter}\n`

        // End the wrapper for the function
        output += '}\n\n';
    }
    return output
}

function getAllFunctions() {
    return raylib.raylib.functions
        .concat(raylib.raymath.functions)
        .concat(raylib.rlgl.functions)
}

const functionsImplementations = getFunctionImplementations(getAllFunctions())

/**
 * Writes the code to register the functions to Umka.
 */
function getFuncCalls(functions) {
    let output = ''
    for (let func of functions) {
        // Blacklist
        if (functionBlackList.includes(func.name)) {
            output += `    // Skipping ${func.name}\n`
            continue
        }

        output += `    // ${func.name}()\n    if (!umkaAddFunc(umka, "${func.name}", &umka${func.name})) {
        TraceLog(LOG_ERROR, "UMKA: Failed to add function ${func.name}()");
        return false;
    }\n`
    }
    return output
}
const umkaAddFuncCalls = getFuncCalls(getAllFunctions())

/**
 * Translates a raylib type over to an Umka type.
 */
function raylibTypeToUmka(type) {
    switch (type) {
        case 'double':
            return 'real'
        case 'unsigned int':
            return 'uint32'
        case 'char **':
            return '^str'
        case 'Rectangle **':
            return '^void'
        case 'const Vector3':
            return 'Vector3'
        case 'const Matrix *':
            return '^Matrix'
        case 'const GlyphInfo *':
            return '^void'
        case 'const int *':
            return '^int32'
        case 'const char **':
            return '^str'
        case 'int':
            return 'int32'
        case 'char':
            return 'char'
        case 'char *':
            return 'str'
        case 'float *':
            return '^real32'
        case 'Camera':
            return 'Camera3D'
        case 'Texture2D':
        case 'TextureCubemap':
            return 'Texture'
        case 'RenderTexture2D':
            return 'RenderTexture'
        case 'rAudioBuffer *':
        case 'rAudioProcessor *':
            return '^void'
        case 'float[2]':
            return '[2]real32'
        case 'float[3]':
            return '[3]real32'
        case 'float[4]':
            return '[4]real32'
        case 'float[16]':
            return '[16]real32'
        case 'unsigned char':
            return 'uint8'
        case 'Transform **':
            return '^void'
        case 'float':
            return 'real32'
        case 'bool':
            return 'bool'
        case 'const char *':
            return 'str'
        case 'unsigned char *':
        case 'const unsigned char *':
            return '^uint8'
        case 'unsigned short *':
            return '^uint16'
        case 'unsigned int *':
            return '^uint32'
        case 'long':
            return 'int'
        case 'unsigned long long':
            return 'uint'
        case 'void *':
        case 'const void *':
            return '^void'
        case 'char[32]':
            return '[32]char'
        case 'Texture2D':
        case 'TextureCubemap':
            return 'Texture'
        case 'RenderTexture2D':
            return 'RenderTexture'
        case 'Quaternion':
            return 'Vector4'
        case 'Rectangle *':
            return '^Rectangle'
        case 'Matrix[2]':
            return '[2]Matrix'
    }

    if (type.endsWith(' *')) {
        return '^' + raylibTypeToUmka(type.replace(' *', ''))
    }

    return `${type}`
}

// Track the line number for the module code.
let lineNumber = 1

/**
 * Structures to black list from displaying.
 */
const structureBlackList = [
    'rlVertexBuffer',
    'rlRenderBatch'
]

function getAllStructs() {
    // Grab all the structs across all libraries
    let structs = [
        ...raylib.raylib.structs,
        ...raylib.raymath.structs,
        ...raylib.rlgl.structs
    ]

    // Remove duplicate structs.
    let names = []
    structs = structs.filter(struct => {
        if (names.includes(struct.name)) {
            return false
        }
        names.push(struct.name)
        return true
    })
    return structs
}

/**
 * Get the structure code.
 */
const structures = getStructures(getAllStructs())

const callbacksBlacklist = [
    'TraceLogCallback',
    // 'LoadFileDataCallback',
    // 'SaveFileDataCallback',
    // 'LoadFileTextCallback',
    // 'SaveFileTextCallback',
    // 'AudioCallback'
]
function getCallbacks(callbacks) {
    let output = `        /* ${outputLineNumber()} */ "type (\\n"\n`

    for (let callback of callbacks) {
        if (callbacksBlacklist.includes(callback.name)) {
            output += `        // Skipped ${callback.name}\n`
            continue
        }
        let params = []

        for (let param of callback.params) {
            params.push(`${param.name}: ${raylibTypeToUmka(param.type)}`)
        }
        let returnType = raylibTypeToUmka(callback.returnType)
        if (returnType) {
            if (returnType == 'void') {
                returnType = ''
            }
            else {
                returnType = ': ' + returnType
            }
        }
        output += `        /* ${outputLineNumber()} */ "    ${callback.name} = fn(${params.join(', ')})${returnType}\\n"\n`
    }

    output += `        /* ${outputLineNumber()} */ ")\\n"`
    return output;
}


/**
 * Retrieve all callbacks across all the raylib modules.
 */
 function getAllCallbacks() {

    let callbackNames = []

    let allCallbacks = [
        ...raylib.raylib.callbacks,
        ...raylib.raymath.callbacks,
        ...raylib.rlgl.callbacks
    ]

    allCallbacks = allCallbacks.filter(details => {
        if (callbackNames.includes(details.name)) {
            return false
        }
        callbackNames.push(details.name)
        return true
    })

    return allCallbacks
}
const callbacks = getCallbacks(raylib.raylib.callbacks)

function getModuleFunctionDeclarationsCleanParamName(name) {
    if (name == 'type') {
        return name + 'Input'
    }
    return name
}

/**
 * Builds the module declarations for the module.
 */
function getModuleFunctionDeclarations(functions) {
    output = ''
    for (let func of functions) {
        // Blacklist
        if (functionBlackList.includes(func.name)) {
            output += `        // Skipping ${func.name}\n`
            continue
        }

        let paramList = []
        if (func.params) {
            for (let param of func.params) {
                let paramName = getModuleFunctionDeclarationsCleanParamName(param.name)
                paramList.push(`${paramName}: ${raylibTypeToUmka(param.type)}`)
            }
        }

        let returnType = ''
        if (func.returnType && func.returnType != 'void') {
            returnType = `: ${raylibTypeToUmka(func.returnType)}`
        }

        output += `        /* ${outputLineNumber()} */ "fn ${func.name}*(${paramList.join(', ')})${returnType}\\n"\n`
    }
    return output
}
const moduleFunctionDeclarations = getModuleFunctionDeclarations(getAllFunctions())

/**
 * Increases the line number and outputs it in a clean format
 */
function outputLineNumber() {
    return String(lineNumber++).padStart(4, '0')
}

/**
 * Translates all structs into a valid Umka code.
 */
function getStructures(structs) {
    output = `        /* ${outputLineNumber()} */ "type (\\n"\n`

    for (let struct of structs) {
        if (structureBlackList.includes(struct.name)) {
            continue
        }

        output += `        /* ${outputLineNumber()} */ "  ${struct.name}* = struct {\\n"\n`
        for (let field of struct.fields) {
            output += `        /* ${outputLineNumber()} */ "    ${field.name}: ${raylibTypeToUmka(field.type)}\\n"\n`
        }
        output += `        /* ${outputLineNumber()} */ "  }\\n"\n`
    }

    output += `        /* ${outputLineNumber()} */ ")\\n"`
    return output
}

function getAllEnums() {
    let enumNames = []

    let allEnums = [
        ...raylib.raylib.enums,
        ...raylib.raymath.enums,
        ...raylib.rlgl.enums
    ]

    allEnums = allEnums.filter(enumDetails => {
        if (enumNames.includes(enumDetails.name)) {
            return false
        }
        enumNames.push(enumDetails.name)
        return true
    })

    return allEnums
}

/**
 * Creates Umka code for all the given enums.
 */
function getEnums(enums) {
    output = []

    for (let define of enums) {
        for (let val of define.values) {
            output.push(`        /* ${outputLineNumber()} */ "const ${val.name}* = ${val.value}\\n"`)
        }
    }
    return output.join('\n')
}
const enums = getEnums(getAllEnums())

// Blacklist of defines
const definesBlackList = []

function getDefines(defines) {
    let output = ''
    for (let define of defines) {
        // Blacklist
        if (definesBlackList.includes(define)) {
            continue
        }

        // Don't write any GUARDS
        if (define.type == 'GUARD') {
            continue
        }

        // Manually handle the colors.
        if (define.type == 'COLOR') {
            output += `        /* ${outputLineNumber()} */ "const ${define.name}* = ${define.value.replace('CLITERAL(Color)', 'Color')}\\n"\n`
            continue
        }

        if (define.type == 'STRING') {
            output += `        /* ${outputLineNumber()} */ "const ${define.name}* = \\"${define.value}\\"\\n"\n`
            continue
        }

        if (define.type == 'FLOAT') {
            output += `        /* ${outputLineNumber()} */ "const ${define.name}* = ${define.value}\\n"\n`
            continue
        }

        output += `        // Skipped define: ${define.name}\n`
    }
    return output
}

/**
 * Retrieve all defines across all the raylib modules.
 */
function getAllDefines() {

    let defineNames = []

    let allDefines = [
        ...raylib.raylib.defines,
        ...raylib.raymath.defines,
        ...raylib.rlgl.defines
    ]

    allDefines = allDefines.filter(defineDetails => {
        if (defineNames.includes(defineDetails.name)) {
            return false
        }
        defineNames.push(defineDetails.name)
        return true
    })

    return allDefines
}

const defines = getDefines(getAllDefines())

const pkg = require('../package.json')
let code =
`/**********************************************************************************************
*
*   ${pkg.name} v${pkg.version} - ${pkg.description}
*
*   ${pkg.homepage}
*
*   DEPENDENCIES:
*       - raylib 4.2 https://www.raylib.com/
*       - Umka https://github.com/vtereshkov/umka-lang
*
*   NOTE: Do not edit this file, as it is automatically generated.
*
*   LICENSE: ${pkg.license}
*
*   ${pkg.name} is licensed under an unmodified zlib/libpng license, which is an OSI-certified,
*   BSD-like license that allows static linking with closed source software:
*
*   Copyright (c) 2022 ${pkg.author}
*
*   This software is provided "as-is", without any express or implied warranty. In no event
*   will the authors be held liable for any damages arising from the use of this software.
*
*   Permission is granted to anyone to use this software for any purpose, including commercial
*   applications, and to alter it and redistribute it freely, subject to the following restrictions:
*
*     1. The origin of this software must not be misrepresented; you must not claim that you
*     wrote the original software. If you use this software in a product, an acknowledgment
*     in the product documentation would be appreciated but is not required.
*
*     2. Altered source versions must be plainly marked as such, and must not be misrepresented
*     as being the original software.
*
*     3. This notice may not be removed or altered from any source distribution.
*
**********************************************************************************************/

#ifndef RAYLIB_UMKA_H_
#define RAYLIB_UMKA_H_

#if defined(__cplusplus)
extern "C" {
#endif

/**
 * Adds the raylib module to an Umka instance.
 *
 * @param umka The Umka instance you would like to add the raylib module to.
 *
 * @return True if it succeeds, false otherwise.
 */
bool umkaAddRaylib(void *umka);

#if defined(__cplusplus)
}
#endif

#endif  // RAYLIB_UMKA_H_

#ifdef RAYLIB_UMKA_IMPLEMENTATION
#ifndef RAYLIB_UMKA_IMPLEMENTATION_ONCE
#define RAYLIB_UMKA_IMPLEMENTATION_ONCE

// raylib.h
#ifndef RAYLIB_UMKA_RAYLIB_H
#define RAYLIB_UMKA_RAYLIB_H "raylib.h"
#endif
#include RAYLIB_UMKA_RAYLIB_H

// raymath.h
#ifndef RAYLIB_UMKA_RAYMATH_H
#define RAYLIB_UMKA_RAYMATH_H "raymath.h"
#endif
#include RAYLIB_UMKA_RAYMATH_H

// rlgl.h
#ifndef RAYLIB_UMKA_RLGL_H
#define RAYLIB_UMKA_RLGL_H "rlgl.h"
#endif
#include RAYLIB_UMKA_RLGL_H

// umka_api.h
#ifndef RAYLIB_UMKA_UMKA_API_H
#define RAYLIB_UMKA_UMKA_API_H "umka_api.h"
#endif
#include RAYLIB_UMKA_UMKA_API_H

// memcpy()
#ifndef RAYLIB_UMKA_MEMCPY
#include <string.h>
#define RAYLIB_UMKA_MEMCPY memcpy
#endif

#if defined(__cplusplus)
extern "C" {
#endif

${functionsImplementations}
/**
 * Umka implementation for TraceLog(). This is manually implemented.
 *
 * @see TraceLog()
 */
void umkaTraceLog(UmkaStackSlot *params, UmkaStackSlot *result) {
    int logType = params[1].intVal;
    const char* message = (const char*)params[0].ptrVal;
    TraceLog(logType, "%s", message);
}

/**
 * Adds the raylib module to the given Umka instance.
 *
 * @param umka The Umka environment to add the raylib module to.
 *
 * @return TRUE when the raylib module is successfully added, FALSE otherwise.
 */
bool umkaAddRaylib(void *umka) {
    // TraceLog() -- Manually implemented.
    if (!umkaAddFunc(umka, "TraceLog", &umkaTraceLog)) {
        return false;
    }

${umkaAddFuncCalls}
    /**
     * The code for the raylib umka module.
     */
    const char* moduleCode =
        // Structures
${structures}

        // Callbacks
${callbacks}

        // Function Declarations
${moduleFunctionDeclarations}
        // Enums
${enums}

        // Defines
${defines}
        // Custom functions
        "fn TraceLog*(errorType: int , message: str)\\n"

        // End of the module.
        " ";

    return umkaAddModule(umka, "raylib", moduleCode);
}

#if defined(__cplusplus)
}
#endif

#endif // RAYLIB_UMKA_IMPLEMENTATION_ONCE
#endif // RAYLIB_UMKA_IMPLEMENTATION
`

fs.writeFileSync(outputFile, code)
