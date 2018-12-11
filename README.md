# Possible AMD driver bug on Windows

I have hit a scenario where combining indexing into an array of samplers in a dynamic and non-uniform fashion (allowed via the EXT_descriptor_indexing extension) in combination with a fragment shader making use of the `discard` statement will systematically cause an application crash due to a lost device on AMD GCN graphics hardware on Windows.

I believe this is due to a driver bug and have taken steps to isolate the problem, I do not have the technical expertise to claim this is absolutely a driver bug and not some
wrong-doing on my part, but I have great confidence my program is following the Vulkan specification to the letter and my usage is valid.

I have managed to isolate the problem and can cause it to happen 100% of the time. I have tested this reproduction on multiple machines with identical results.

## Reproduction steps

1) launch via rip-amd-driver.bat or .sh
2) use default login (kektest/kektest)
3) click singleplayer
4) click namalsk-cs20
5) you should get a driver malfunction notification and a freeze while the game gets stuck on a blue screen and may report error code -4 ( VK_ERROR_DEVICE_LOST ) in stdout.

## Workarround and live-shader reloading

The "best" workarround I found is edit the `res/shaders/cubes/cubes.frag` file and to move this line

`float NdL = clamp(dot(sunPos, normal.xyz), 0.0, 1.0);`

after the virtualTextures[] texture fetch:

`vec4 albedo = texture(virtualTextures[textureId], texCoord);`

Try editing the file and see for yourselves that the program will indeed work in that case.
To further play with shaders, you can live-reload using the `/reload rendergraph` command in the game console ( press the T key )

### All possible workarrounds/similar cases that don't trigger the problem

 * If the `float NdL = clamp(dot(sunPos, normal.xyz), 0.0, 1.0);` line is after the texture fetch, it works as expected and the problem doesn't manifest. This workarround can allow me to continue working, however being at the mercy of this issue popping up elsewhere.
 * If the vertex data is modified so every textureId is the same ( so the dynamically uniform scenario, like when NOT using EXT_descriptor_indexing ), the problem doesn't manifest.
 * If the EXT_descriptor_indexing extension is not present, not used or it's `shaderSampledImageArrayNonUniformIndexing` feature is not supported or enabled ( like on the linux RADV driver, which I tested this on ), 
 then the crash won't happen but artifacts will happen. These artifacts are to be expected in that case since I violate the spec and aren't part of the bug report.
 * If the discard statement and branch is removed from the shader, the problem doesn't manifest no matter where the `NdL` variable is computed.

## Engine informations

This is from a build of an open-source [game project](https://github.com/Hugobros3/chunkstories/tree/vulkan) written in Java and Kotlin. I make use of spirvcross to pre-process my authored GLSL files into the Vulkan GLSL semantics ( adding `layout` annotations and the `nonuniformEXT` annotation where supported ), and then use glslangValidator to compile them into spir-v bytecode at runtime before handing it over to Vulkan. 

I have looked at the output from spirvcross for the problem case and it is identical modulo the afformentioned preprocessing. I output it to stdout if you'd like to check. I've also bundled decompiled gcb assembly for both the stock and workarround versions of the problematic shader (`dissassembled_shader_ko` and `ok`, respectively), but don't have confidence in my ability to infer anything from them.

## Further informations

I am using Vulkan 1.1.70 on the latest Adrenalin drivers (18.12.1.1) with a Saphire RX 580 4GB on Windows 8.1,
running on a a Ryzen 1700 at stock clocks. 

I have the LunarG SDK installed.
The bug manifests itself wether or not I enable the validation layer, which furthemore has nothing to report on the matter.

I am using Oracle's Java SE JDK 1.8.0_144 64-bit ( that's definitely irrelevant ). 