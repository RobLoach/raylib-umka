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
