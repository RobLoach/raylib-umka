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
            return `params[${key}].uintVal`
        case 'int':
        case 'long':
            return `params[${key}].intVal`
        case 'bool':
            return `(bool)params[${key}].intVal`
    }

    return `(${param.type})params[${key}].ptrVal`
}

/**
 * Sees whether the given type is a reserved raylib type.
 */
function getIsRaylibStruct(type) {
    return [
        'Color',
        'Vector2',
        'Vector3',
        'Vector4',
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
            return [`result->uintVal = `, '']
        case 'long':
            return [`result->intVal = `, '']
        case 'float':
            return [`result->real32Val = `, '']
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

    // TODO: Figure out how to return a Vector2 object. For example: GetMousePosition()
    return ['', '']
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
 * Umka bindings for ${func.name}.
 *
 * @see ${func.name}()
 */
void umka${func.name}(UmkaStackSlot *params, UmkaStackSlot *result) {\n`

        let params = []
        let paramsInFunction = []
        if (func.params) {
            // Params
            let last = func.params.length - 1;
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

const functionsImplementations = getFunctionImplementations(raylib.raylib.functions)

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
const umkaAddFuncCalls = getFuncCalls(raylib.raylib.functions)

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
        case 'float *':
            return '^real32'
        case 'float[2]':
            return '[2]real32'
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
        case 'float[4]':
            return '[4]real32'
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
const structureBlackList = []

/**
 * Get the structure code.
 */
const structures = getStructures(raylib.raylib.structs)

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
                paramList.push(`${param.name}: ${raylibTypeToUmka(param.type)}`)
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
const moduleFunctionDeclarations = getModuleFunctionDeclarations(raylib.raylib.functions)

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
const enums = getEnums(raylib.raylib.enums)

// Blacklist of defines
const definesBlackList = [
    'RAYLIB_H',
    '__declspec(x)',
    'RLAPI',
    'DEG2RAD',
    'RAD2DEG',
    'RL_MALLOC(sz)',
    'RL_CALLOC(n,sz)',
    'RL_REALLOC(ptr,sz)',
    'RL_FREE(ptr)',
    'CLITERAL(type)',
    'RL_COLOR_TYPE',
    'RL_RECTANGLE_TYPE',
    'RL_VECTOR2_TYPE',
    'RL_VECTOR3_TYPE',
    'RAYLIB_H',
    'RAYLIB_H',
    'RAYLIB_H',
    'RAYLIB_H',
]

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

const defines = getDefines(raylib.raylib.defines)
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
*   Copyright (c) 2022 Rob Loach (@RobLoach)
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

// umka_api.h
#ifndef RAYLIB_UMKA_UMKA_API_H
#define RAYLIB_UMKA_UMKA_API_H "umka_api.h"
#endif
#include RAYLIB_UMKA_UMKA_API_H

#ifndef RAYLIB_UMKA_MEMCPY
#include <string.h>
#define RAYLIB_UMKA_MEMCPY memcpy
#endif

#if defined(__cplusplus)
extern "C" {
#endif

${functionsImplementations}

void rlTraceLog(UmkaStackSlot *params, UmkaStackSlot *result) {
    int logType = params[1].intVal;
    const char* message = (const char*)params[0].ptrVal;
    TraceLog(logType, message);
}

bool umkaAddRaylib(void *umka) {

    // TraceLog -- Manually implemented.
    if (!umkaAddFunc(umka, "TraceLog", &rlTraceLog)) {
        return false;
    }

${umkaAddFuncCalls}
    /**
     * The code for the raylib umka module.
     */
    const char* moduleCode =
        // Structures
${structures}

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
