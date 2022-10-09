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
    bool success = true;
    success &= umkaAddFunc(umka, "TraceLog", &rlTraceLog);

    
    return success;
}

#if defined(__cplusplus)
}            // Prevents name mangling of functions
#endif

#endif // RAYLIB_UMKA_IMPLEMENTATION_ONCE
#endif // RAYLIB_UMKA_IMPLEMENTATION