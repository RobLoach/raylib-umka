# raylib
find_package(raylib)
find_package(umka)

# raylib-umka
add_executable(raylib-umka
    raylib-umka.c
)
target_link_libraries(raylib-umka PUBLIC
    raylib
    umka
    raylib-umka-h
)

# Web Configurations
if (${PLATFORM} STREQUAL "Web")
    set_target_properties(raylib-umka PROPERTIES
        SUFFIX ".html"
        OUTPUT_NAME "index"
    )
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} --shell-file ${CMAKE_CURRENT_SOURCE_DIR}/shell.html")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -sASSERTIONS")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -sALLOW_MEMORY_GROWTH")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -sEXPORTED_RUNTIME_METHODS=ccall,cwrap")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -sASYNCIFY")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -sSINGLE_FILE")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -s USE_GLFW=3")
endif()
