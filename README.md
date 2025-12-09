# MemoryApp
Juego de memoria

## Configuración de la IA (ChatGPT)

Para habilitar el modo "Contra la IA" con decisiones impulsadas por OpenAI, define las siguientes variables de entorno antes de ejecutar la aplicación:

- `OPENAI_API_KEY`: clave de API de OpenAI (obligatoria para activar las llamadas a la IA).
- `OPENAI_MODEL`: modelo a utilizar (opcional, por defecto `gpt-4.1-mini`).

Si no se configura la clave, el modo seguirá disponible con un algoritmo mejorado integrado, pero sin las sugerencias del modelo de OpenAI.
