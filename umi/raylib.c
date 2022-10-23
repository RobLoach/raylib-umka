/**
 * String-ify a _Pragma call to rename exported functions.
 */
#define DO_PRAGMA_(x) _Pragma (#x)
#define DO_PRAGMA(x) DO_PRAGMA_(x)

/**
 * Tell the linker to rename the umka* functions to the correct raylib method.
 */
#define RAYLIB_UMKA_FUNCTION(functionName) DO_PRAGMA("comment(linker, \"/EXPORT:umka" #functionName "=" #functionName "\")")

/**
 * Skip compiling the umkaAddRaylib() function. We don't need it for the .umi.
 */
#define RAYLIB_UMKA_NO_ADD_MODULE

#define RAYLIB_UMKA_IMPLEMENTATION
#include "raylib-umka.h"
