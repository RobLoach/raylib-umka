/**
 * raylib-umka
 *
 * Dependencies:
 *   - raylib
 *   - umka
 */

#ifndef RAYLIB_UMKA_H_
#define RAYLIB_UMKA_H_

#include "raylib.h"
#include "umka_api.h"

#if defined(__cplusplus)
extern "C" {            // Prevents name mangling of functions
#endif

bool umkaAddRaylib(void *umka);

#if defined(__cplusplus)
}            // Prevents name mangling of functions
#endif

#endif  // RAYLIB_UMKA_H_

#ifdef RAYLIB_UMKA_IMPLEMENTATION
#ifndef RAYLIB_UMKA_IMPLEMENTATION_ONCE
#define RAYLIB_UMKA_IMPLEMENTATION_ONCE

#if defined(__cplusplus)
extern "C" {            // Prevents name mangling of functions
#endif

void rlTraceLog(UmkaStackSlot *params, UmkaStackSlot *result) {
    int logType = params[1].intVal;
    const char* message = (const char*)params[0].ptrVal;
    TraceLog(logType, message);
}

bool umkaAddRaylib(void *umka) {
    if (!umkaAddFunc(umka, "TraceLog", &rlTraceLog)) {
        return false;
    }

    const char* moduleCode =
        "fn TraceLog*(errorType: int , message: str)\n"

        // Structures
        "type (\n"
        "  Vector2* = struct {\n"
        "        x:real32\n"
        "       y:real32\n"
        " }\n"
        ") \n"

        // Defines
        "const LOG_INFO* = 3\n"
        " ";
;


    TraceLog(LOG_INFO, "raylib.um\n%s", moduleCode);
    return umkaAddModule(umka, "raylib", moduleCode);
}

#if defined(__cplusplus)
}            // Prevents name mangling of functions
#endif

#endif // RAYLIB_UMKA_IMPLEMENTATION_ONCE
#endif // RAYLIB_UMKA_IMPLEMENTATION
