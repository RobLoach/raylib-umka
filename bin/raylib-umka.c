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
    // Make sure it runs in the correct folder.
    if (!ChangeDirectory(GetDirectoryPath(fileToLoad))) {
        TraceLog(LOG_WARNING, "Failed to change directory");
    }

    void *umka = umkaAlloc();

    bool result = umkaInit(umka, NULL, fileText, 1024* 1024, NULL, 0, NULL, false, false, NULL);
    UnloadFileText(fileText);

    if (result) {
        TraceLog(LOG_INFO, "1");
        result = umkaAddRaylib(umka);
    }

    if (result) {
        TraceLog(LOG_INFO, "2");
        int mainCall = umkaGetFunc(umka, NULL, "main");
        TraceLog(LOG_INFO, "3");
        result = umkaCall(umka, mainCall, 0, NULL, NULL);
        TraceLog(LOG_INFO, "4");
    }


    if (!result) {
        TraceLog(LOG_INFO, "5");
        UmkaError error;
        umkaGetError(umka, &error);
        printf("Umka error %s (%d, %d): %s\n", error.fileName, error.line, error.pos, error.msg);
    }

    umkaFree(umka);

    return 0;
}