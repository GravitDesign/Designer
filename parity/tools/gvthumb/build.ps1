# Builds GravitThumbnail.dll from native/gvthumb into this folder's build/
# (native/ itself stays untouched). Needs CMake 3.20+ and Visual Studio with
# the C++ workload; CMake downloads zlib 1.3.1 on the first run.
$ErrorActionPreference = "Stop"
$sourceDir = Join-Path $PSScriptRoot "..\..\..\..\native\gvthumb"
$buildDir = Join-Path $PSScriptRoot "build"
cmake -S $sourceDir -B $buildDir -A x64
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmake --build $buildDir --config Release
exit $LASTEXITCODE
