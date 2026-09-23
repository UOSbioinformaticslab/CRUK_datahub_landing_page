// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync } from 'fs'

const localSemanticSchemaJson = resolve(__dirname, '../semantic-schema/cruk-semantic-schema/semanticSchema.json')
const localSchemaDocViewer = resolve(__dirname, '../semantic-schema/cruk-semantic-schema/src/SchemaDocViewer.jsx')

export default defineConfig({
  resolve: {
    alias: {
      'cruk-semantic-schema/src/SchemaDocViewer': existsSync(localSchemaDocViewer)
        ? localSchemaDocViewer
        : 'cruk-semantic-schema/src/SchemaDocViewer',
      'cruk-semantic-schema': existsSync(localSemanticSchemaJson)
        ? localSemanticSchemaJson
        : 'cruk-semantic-schema',
    },
  },



  plugins: [react({
    // FIX: Changed "{jsx.js}" to "{jsx,js}" for correct syntax
    include: "**/*.{jsx,js}",
  })],
  // FIX: Changed base from "./" to "/" to resolve MIME type errors on nested routes
  base: "/",

  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true, // Added for clean builds (recommended)
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries({
          main: resolve(__dirname, 'index.html'),
          about: resolve(__dirname, 'src/about.html'),
          meta: resolve(__dirname, 'src/meta.html'),
          project_meta: resolve(__dirname, 'src/project_meta.html'),
          protect_data: resolve(__dirname, 'src/protect_data.html'),
          publications: resolve(__dirname, 'src/publications.html'),
          projects: resolve(__dirname, 'src/projects.html'),
          datasets: resolve(__dirname, 'src/datasets.html'),
          horizons: resolve(__dirname, 'src/horizons.html'),
          sign_in: resolve(__dirname, 'src/sign_in.html'),
          upload: resolve(__dirname, 'src/upload.html'),
          upload_project: resolve(__dirname, 'src/upload_project.html'),
          upload_publications: resolve(__dirname, 'src/upload_publications.html'),
          dashboard: resolve(__dirname, 'src/dashboard.html'),
          test: resolve(__dirname, 'src/test.html'),
          team_request: resolve(__dirname, 'src/team_request.html'),
          manage_hub: resolve(__dirname, 'src/manage_hub.html'),
          data_custodians: resolve(__dirname, 'src/data_custodians.html'),
          data_custodian: resolve(__dirname, 'src/data_custodian.html'),
          upload_tool: resolve(__dirname, 'src/upload_tool.html'),
          tool: resolve(__dirname, 'src/tool.html'),
          tools: resolve(__dirname, 'src/tools.html'),
          schema_doc: resolve(__dirname, 'src/schema_doc.html'),
        }).filter(([_, path]) => existsSync(path))
      ),
    },
  },
})