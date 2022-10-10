
cmake_minimum_required(VERSION 3.11)
project(raylib-umka
    DESCRIPTION "raylib-umka: Umka bindings for raylib."
    HOMEPAGE_URL "https://github.com/robloach/raylib-umka"
    VERSION 0.0.2
    LANGUAGES C
)

# Register the cmake folder for find_package()
LIST(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

# raylib-umka-h
add_library(raylib-umka-h INTERFACE)
target_include_directories(raylib-umka-h INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/include)

# Options
if ("${CMAKE_SOURCE_DIR}" STREQUAL "${CMAKE_CURRENT_SOURCE_DIR}")
    set(RAYLIB_UMKA_IS_MAIN TRUE)
else()
    set(RAYLIB_UMKA_IS_MAIN FALSE)
endif()
option(RAYLIB_UMKA_BUILD_BIN "Binary" ${RAYLIB_UMKA_IS_MAIN})

# raylib-umka
if (RAYLIB_UMKA_BUILD_BIN)
    add_subdirectory(bin)

    # Testing
    include(CTest)
    enable_testing()
    if (BUILD_TESTING)
        # set(CTEST_CUSTOM_TESTS_IGNORE
        #     pkg-config--static
        # )

        # On failure, display the output.
        list(APPEND CMAKE_CTEST_ARGUMENTS "--output-on-failure")

        add_test(
            NAME raylib-umka-tests
            COMMAND raylib-umka ${CMAKE_CURRENT_SOURCE_DIR}/tests/raylib-umka-tests.um
        )
    endif()
endif()
