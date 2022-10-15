#include <stddef.h>

#include "raylib.h"
#include "umka_api.h"

#define RAYLIB_UMKA_IMPLEMENTATION
#include "raylib-umka.h"

#ifdef PLATFORM_WEB
#ifndef RAYLIB_UMKA_EMSCRIPTEN_H
#define RAYLIB_UMKA_EMSCRIPTEN_H <emscripten/emscripten.h>
#endif
#include RAYLIB_UMKA_EMSCRIPTEN_H
#endif

// Emscripten define to keep the function defined
#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif

/**
 * The Umka instance used to maintain the scripting environment.
 */
void *umka;

/**
 * Emscripten update callback
 */
void umkaUpdate(void* userData) {
    int* updateCall = (int*)userData;
    umkaCall(umka, *updateCall, 0, NULL, NULL);
}

/**
 * Executes the given source string, and names it by the given fileName.
 */
EMSCRIPTEN_KEEPALIVE bool runCode(const char* fileName, const char* sourceString) {
    if (umka != NULL) {
        // Stop the main loop if needed.
        #if defined(PLATFORM_WEB)
            emscripten_cancel_main_loop();
        #endif

        // Call the close function if needed.
        int closeCall = umkaGetFunc(umka, NULL, "close");
        if (closeCall != -1) {
            umkaCall(umka, closeCall, 0, NULL, NULL);
        }

        // Close the window if the application didn't do it.
        if (IsWindowReady()) {
            CloseWindow();
        }

        // Clean up the umka instace.
        umkaFree(umka);
    }

    // Create the Umka instance.
    umka = umkaAlloc();
    bool result = umka != NULL;

    // Initialize based on the given string.
    if (result) {
        result = umkaInit(umka, fileName, sourceString, 1024* 1024, NULL, 0, NULL, false, false, NULL);
    }

    // Add the raylib module to umka.
    if (result) {
        result = umkaAddRaylib(umka);
    }

    // Compile the script.
    if (result) {
        result = umkaCompile(umka);
    }

    // Make sure it runs in the correct folder.
    if (fileName != NULL) {
        if (!ChangeDirectory(GetDirectoryPath(fileName))) {
           TraceLog(LOG_WARNING, "Failed to change directory");
        }
    }

    if (result) {
        // main()
        int mainCall = umkaGetFunc(umka, NULL, "main");
        if (mainCall != -1) {
            result = umkaCall(umka, mainCall, 0, NULL, NULL);
        }

        // init()
        int initCall = umkaGetFunc(umka, NULL, "init");
        if (initCall != -1) {
            umkaCall(umka, initCall, 0, NULL, NULL);
        }

        // update()
        int updateCall = umkaGetFunc(umka, NULL, "update");
        if (updateCall != -1) {
            // Start the Game Loop
            #if defined(PLATFORM_WEB)
                // TODO: Figure out desired FPS?
                //emscripten_set_main_loop(umkaUpdate, 0, 1);
                emscripten_set_main_loop_arg(umkaUpdate, &updateCall, 0, 1);
            #else
                // Stop running if the Window or App have been told to close.
                while (!WindowShouldClose()) {
                    umkaCall(umka, updateCall, 0, NULL, NULL);
                }
            #endif
        }

        // close()
        int closeCall = umkaGetFunc(umka, NULL, "close");
        if (closeCall != -1) {
            umkaCall(umka, closeCall, 0, NULL, NULL);
        }
    }

    if (!result) {
        UmkaError error;
        umkaGetError(umka, &error);
        TraceLog(LOG_ERROR, "UMKA: %s (%d, %d): %s\n", error.fileName, error.line, error.pos, error.msg);
    }

    umkaFree(umka);
    umka = NULL;

    return result;
}

/**
 * Entry point for the application.
 */
int main(int argc, char *argv[]) {
    const char* executableName;
    const char* fileToLoad;

    switch (argc) {
        case 0:
            executableName = "raylib-umka";
            fileToLoad = "main.um";
            break;
        case 1:
            executableName = argv[0];
            fileToLoad = "main.um";
            break;
        default:
            executableName = argv[0];
            fileToLoad = argv[1];
            break;
    }

    // Display some help information in the file isn't found.
    if (!FileExists(fileToLoad)) {
        TraceLog(LOG_ERROR, "File not found %s", fileToLoad);
        return 1;
    }

    // Load the contents of the file.
    char* fileText = LoadFileText(fileToLoad);
    bool result = !TextIsEqual(fileText, "");

    // Run the code if it loaded correctly.
    if (result) {
        result = runCode(fileToLoad, fileText);
    }
    UnloadFileText(fileText);

    return result ? 0 : 1;
}
