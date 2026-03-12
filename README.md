## SafeLink prototype

SafeLink is a compliance assistant for building safety regulations.
The current dataset focuses on ERP Livre I, and the app structure is ready
for additional sources such as ERP Livres II-IV, APSAD, and EN/NF references.

First, install the dependencies:

```bash
pnpm install
```

Next, you need to create a `.env` file in the root of the project and add the following variables:

```env
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4.1-mini
```

To run the development server:

```bash
pnpm dev
```

To run the production server:

```bash
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
