#include <stddef.h>

#include "raylib.h"
#include "umka_api.h"

#define RAYLIB_UMKA_IMPLEMENTATION
#include "raylib-umka.h"

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

    if (!FileExists(fileToLoad)) {
        TraceLog(LOG_ERROR, "File not found %s", fileToLoad);
        return 1;
    }

    char* fileText = LoadFileText(fileToLoad);
    bool result = !TextIsEqual(fileText, "");

    void *umka;
    if (result) {
        umka = umkaAlloc();
        result = umka != NULL;
    }

    if (result) {
        result = umkaInit(umka, NULL, fileText, 1024* 1024, NULL, 0, NULL, false, false, NULL);
    }
    UnloadFileText(fileText);

    if (result) {
        // Add the raylib module to umka.
        result = umkaAddRaylib(umka);
    }

    if (result) {
        result = umkaCompile(umka);
    }

    // Make sure it runs in the correct folder.
    if (!ChangeDirectory(GetDirectoryPath(fileToLoad))) {
       TraceLog(LOG_WARNING, "Failed to change directory");
    }

    if (result) {
        int mainCall = umkaGetFunc(umka, NULL, "main");
        result = umkaCall(umka, mainCall, 0, NULL, NULL);
    }

    if (!result) {
        UmkaError error;
        umkaGetError(umka, &error);
        TraceLog(LOG_WARNING, "UMKA: %s (%d, %d): %s\n", error.fileName, error.line, error.pos, error.msg);
    }

    umkaFree(umka);

    return 0;
}
