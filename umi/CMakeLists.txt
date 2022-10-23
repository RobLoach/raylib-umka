add_library(raylib-umi STATIC raylib.c)
set_target_properties(raylib-umi PROPERTIES
    OUTPUT_NAME "raylib"
    SUFFIX ".umi"
    PREFIX ""
)

target_link_libraries(raylib-umi PUBLIC
    raylib
    umka
    raylib-umka-h
)

configure_file(raylib.um raylib.um)
