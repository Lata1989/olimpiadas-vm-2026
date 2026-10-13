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

### Subir los PDF de las consignas

Guardá cada PDF dentro de `public/challenges/`, por ejemplo:

```text
public/
└── challenges/
    ├── junior-1.pdf
    ├── junior-2.pdf
    ├── senior-1.pdf
    └── ...
```

`public/` está en la raíz del proyecto. Si la carpeta `public/challenges/` todavía
no existe, creala. Para probar en desarrollo, dejá el servidor corriendo y abrí
`http://localhost:3000/challenges/junior-1.pdf`; debe mostrarse o descargarse el PDF.
En MongoDB, el campo `pdfUrl` de ese desafío debe ser
`/challenges/junior-1.pdf`. Para que funcione en Vercel, incluí el PDF en
`public/challenges/` al desplegar el proyecto. Los archivos de esta carpeta son
públicos: no guardes aquí documentos privados.

### Cargar las respuestas y asociarlas a los PDF

Las respuestas correctas se guardan en MongoDB, en la colección `challenges`.
Para cargarlas, enviá un JSON a `POST /api/challenges`. Cada objeto vincula el nivel,
número, ruta del PDF y respuesta correcta. Los números deben comenzar en `1` y
continuar sin saltos dentro de cada nivel enviado.

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
      "pdfUrl": "/challenges/junior-2.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    },
    {
      "level": "Senior",
      "challengeNumber": 1,
      "pdfUrl": "/challenges/senior-1.pdf",
      "answer": "REEMPLAZAR_POR_LA_RESPUESTA"
    }
  ]
}
```

El ejemplo muestra los dos primeros desafíos Junior y el primero Senior. Enviá los
doce objetos (Junior y Senior, desafíos del 1 al 6) para cargar todos los PDF de
ejemplo, y reemplazá cada texto `REEMPLAZAR_POR_LA_RESPUESTA` por la solución real.
Si cargás un nivel por separado, incluí todos sus desafíos desde el número `1`.
Los reenvíos actualizan los desafíos existentes. El `pdfUrl` debe coincidir con el
nombre del archivo en `public/challenges/`. La API compara respuestas sin distinguir
mayúsculas de minúsculas y nunca las devuelve a los equipos.

#### Proteger y llamar el endpoint

Configurá `CHALLENGE_ADMIN_TOKEN` con un secreto aleatorio de al menos 32 caracteres,
tanto en `.env.local` para desarrollo como en las variables de entorno del proyecto
en Vercel. En `.env.local`, agregá `CHALLENGE_ADMIN_TOKEN=tu_secreto_generado`.
Podés generar uno con:

```bash
openssl rand -hex 32
```

Guardá el JSON anterior, con las respuestas reales, en `challenge-config.json` y
mandalo desde la raíz del proyecto. En esta terminal, exportá el mismo token que
configuraste en `.env.local`:

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

Cada equipo ve el desafío que le corresponde en `/dashboard`: el PDF asociado con
un botón de descarga y un único campo para enviar la respuesta. Al acertar, se
registra el tiempo y aparece el siguiente desafío.

Las rutas restantes son `POST /api/register`, `GET /api/challenge?teamId=...`,
`POST /api/challenge` y `GET /api/leaderboard?level=Junior|Senior`.

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
