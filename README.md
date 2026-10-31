This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## API and MongoDB

Set `MONGODB_URI` in `.env.local` and in the Vercel project environment. The optional
`MONGODB_DB` variable selects a database; when omitted, the database in the URI is used.
The API creates a `teams` collection for registrations and competition progress.

### Archivos de problemas

Cada nivel tiene un único PDF con sus cuatro problemas. Guardá los archivos en
`public/challenges/` como `junior-1.pdf` y `senior-1.pdf`.

```text
public/challenges/junior-1.pdf
public/challenges/senior-1.pdf
```

La inscripción ofrece descargar el archivo del nivel elegido y `/dashboard`
mantiene disponible el mismo enlace. Los archivos de `public/` son públicos: no
guardes allí documentos privados.

### Logos de la página de inicio

Guardá los dos archivos PNG en `public/logos/` con estos nombres; la página los
muestra automáticamente:

```text
public/logos/logo-1.png
public/logos/logo-2.png
```

### Registros para probar

Las respuestas cargadas en MongoDB para probar el avance son:

| Nivel | Desafío 1 | Desafío 2 | Desafío 3 | Desafío 4 |
|---|---:|---:|---:|---:|
| Junior | `30132` | `38` | `18` | `60` |
| Senior | `18` | `60` | `1674` | `130` |

Las respuestas de los desafíos de autómatas son provisionales: los resultados de
los ejemplos de los PDFs no coinciden con las reglas escritas. Revisalos antes de
usar la competencia oficialmente.

### Cargar las respuestas de los desafíos

Las respuestas correctas se guardan en MongoDB, en la colección `challenges`.
Para cargarlas, enviá un JSON a `POST /api/challenges`. Cada nivel enviado debe
incluir sus cuatro respuestas, numeradas consecutivamente del `1` al `4`. Los
cuatro desafíos de un nivel apuntan al PDF único de ese nivel.

```json
{
  "challenges": [
    {
      "level": "Junior",
      "challengeNumber": 1,
      "pdfUrl": "/challenges/junior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Junior",
      "challengeNumber": 2,
      "pdfUrl": "/challenges/junior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Junior",
      "challengeNumber": 3,
      "pdfUrl": "/challenges/junior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Junior",
      "challengeNumber": 4,
      "pdfUrl": "/challenges/junior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Senior",
      "challengeNumber": 1,
      "pdfUrl": "/challenges/senior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Senior",
      "challengeNumber": 2,
      "pdfUrl": "/challenges/senior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Senior",
      "challengeNumber": 3,
      "pdfUrl": "/challenges/senior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Senior",
      "challengeNumber": 4,
      "pdfUrl": "/challenges/senior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    }
  ]
}
```

Reemplazá cada texto `REEMPLAZAR_POR_LA_RESPUESTA` por la solución real. Podés
cargar Junior y Senior juntos o enviar los cuatro desafíos de un solo nivel. Los
reenvíos actualizan los desafíos existentes. La API compara respuestas sin
distinguir mayúsculas de minúsculas y nunca las devuelve a los equipos.

### Panel de administración y carga de respuestas

Configurá `CHALLENGE_ADMIN_TOKEN` con un secreto aleatorio de al menos 32 caracteres,
tanto en `.env.local` como en las variables de entorno del proyecto en Vercel.
Podés generar uno con:

```bash
openssl rand -hex 32
```

El panel privado `/admin` usa este token para mostrar todos los equipos agrupados
por nivel, el desafío actual, el tiempo del desafío, el tiempo total y la hora de
inicio. Actualizá los datos con F5 o con el botón **Actualizar**. La tabla de
posiciones privada se abre desde el panel autenticado; la API también exige el
token. La sesión se conserva en la pestaña actual para que F5 no te pida ingresar
de nuevo. El mismo token protege la carga de respuestas.

Para cargar respuestas, guardá el JSON con las soluciones reales en
`challenge-config.json`, exportá el token y ejecutá desde la raíz del proyecto:

```bash
export CHALLENGE_ADMIN_TOKEN="PEGA_AQUI_EL_TOKEN_GENERADO"

curl --fail-with-body \
  -X POST http://localhost:3000/api/challenges \
  -H "Authorization: Bearer $CHALLENGE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @challenge-config.json
```

Para cargarlo en producción, reemplazá la URL local por la URL de tu sitio en Vercel
y usá el mismo header con el token guardado en un entorno seguro. No subas el token
ni el archivo que contiene las respuestas al repositorio. Una carga correcta devuelve
cuántos desafíos se insertaron y cuántos se actualizaron; datos incompletos o un
token inválido producen un error explícito.

Cada equipo ve en `/dashboard` el desafío que le corresponde, un enlace al PDF
completo del nivel y un único campo para enviar la respuesta. Al acertar, se guarda
en MongoDB el tiempo parcial y aparece el siguiente desafío. La base conserva la
hora de inicio y, al completar el cuarto desafío, la hora de finalización; el tiempo
total se calcula con esas marcas de tiempo.

Las rutas de competencia son `POST /api/register`, `GET /api/challenge?teamId=...`,
`POST /api/challenge` y `GET /api/leaderboard?level=Junior|Senior`. El panel consulta
`GET /api/admin/teams`, que requiere el token de administración.

### Retomar un equipo

Para volver a entrar a un equipo, usá el mismo formulario de inicio con el mismo
nombre del equipo, nivel y nombres de integrantes. `POST /api/register` busca una
coincidencia y devuelve su `teamId` existente, en lugar de crear un equipo nuevo.
El nombre del equipo y los nombres de los integrantes se comparan sin distinguir
mayúsculas/minúsculas ni espacios al principio o al final; el orden de los
integrantes no importa. Deben ingresar todos los mismos integrantes.

Al retomar, no se modifica el inicio original, el desafío actual ni los tiempos
parciales: si el equipo estaba en el desafío 3, vuelve a ese desafío. El tiempo que
pasa fuera del sitio sigue transcurriendo desde que comenzó ese desafío. Un equipo
finalizado también puede volver a entrar y verá el resumen final.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
