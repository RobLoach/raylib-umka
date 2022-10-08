# UMKA_VERSION
# todo: Switch to FindPackageHandleStandardArgs
if (NOT UMKA_VERSION)
    set(UMKA_VERSION "f8db6843ef7e2211c120751af7b40ed97e24cb23")
endif()

# Options
option(UMKA_SHARED "Umka: Build as shared" FALSE)

# UMKA
include(FetchContent)
FetchContent_Declare(
   Umka
   GIT_REPOSITORY https://github.com/vtereshkov/umka-lang.git
   GIT_TAG "${UMKA_VERSION}"
)
FetchContent_MakeAvailable(Umka)

# Sources
set(UMKA_SRC_DIR ${umka_SOURCE_DIR}/src)
set(UMKA_SRC
    ${UMKA_SRC_DIR}/umka_api.c
    ${UMKA_SRC_DIR}/umka_common.c
    ${UMKA_SRC_DIR}/umka_compiler.c
    ${UMKA_SRC_DIR}/umka_const.c
    ${UMKA_SRC_DIR}/umka_decl.c
    ${UMKA_SRC_DIR}/umka_expr.c
    ${UMKA_SRC_DIR}/umka_gen.c
    ${UMKA_SRC_DIR}/umka_ident.c
    ${UMKA_SRC_DIR}/umka_lexer.c
    ${UMKA_SRC_DIR}/umka_runtime.c
    ${UMKA_SRC_DIR}/umka_stmt.c
    ${UMKA_SRC_DIR}/umka_types.c
    ${UMKA_SRC_DIR}/umka_vm.c
)

# Dependencies
include(CheckLibraryExists)

# Dependency: Math
check_library_exists(m cos "" HAVE_LIB_M)
if (HAVE_LIB_M)
    set(UMKA_LIBS ${UMKA_LIBS} m)
endif()

# Library
if (UMKA_SHARED)
    add_library(umka SHARED ${UMKA_SRC})
else()
    add_library(umka STATIC ${UMKA_SRC})
endif()

target_include_directories(umka PUBLIC ${UMKA_SRC_DIR})
target_link_libraries(umka PUBLIC ${UMKA_LIBS})
