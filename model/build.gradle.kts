plugins {
    // Kotlin Symbol Processing plugin for code generation
    id("com.google.devtools.ksp").version("2.1.20-1.0.31")
    id("maven-publish")
}

// Configure Maven publication
publishing {
    publications {
        create<MavenPublication>("maven") {
            version = "1.2"

            from(components["java"])
        }
    }
}

dependencies {
    // Moshi code generation for Kotlin
    ksp("com.squareup.moshi:moshi-kotlin-codegen:1.15.0")
    // JSON parsing library
    implementation("com.squareup.moshi:moshi:1.15.0")
}
