#version 450
/*
	AMD potential bug report: This is the shader that can cause the crash.
	I made it very simple to demonstrate the problem is likely due to a driver bug
	rather than just complex shaders timing out.
*/

layout(set=0, location=0) uniform sampler2D virtualTextures[1024];

// About the lack of layout annotations, I preprocess the shader with spirv-cross
// The outputed glsl code is then fed to an embedded version of glslValidator and also printed to stdout
// I also provide compiled isa dumps for my GPU (Ellesmere), both with 
in vec4 color;
in vec3 normal;
in vec2 texCoord;
flat in int textureId;

in float fogStrength;

out vec4 colorOut;
out vec4 normalOut;

void main()
{
	// Hardcoded sun position for now
	vec3 sunPos = vec3(1.0, 1.5, 0.3);
	sunPos = normalize(sunPos);

	// Move this after the texture fetch and no crash !
	float NdL = clamp(dot(sunPos, normal.xyz), 0.0, 1.0);
	
	/* The magic virtual texturing stuff 
	requires EXT_descriptor_indexing.shaderSampledImageArrayNonUniformIndexing, and wrapping the array index in nonUniformEXT()
	which is done in a preprocess stage to keep the shader source looking sane and my shader devs happy. Again check stdout if you have doubts about it! */
	vec4 albedo = texture(virtualTextures[textureId], texCoord);
	
	/*if(albedo.a == 0.0) {
		discard;
	}*/

	colorOut = vec4(albedo.rgb * (NdL * 0.8 + 0.2), 1.0);
	normalOut = vec4(normal * 0.5 + vec3(0.5), 1.0);
}