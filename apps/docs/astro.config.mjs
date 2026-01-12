import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"
import mermaid from "astro-mermaid"
// @ts-check
import { defineConfig } from "astro/config"
import starlightLinksValidator from "starlight-links-validator"
import starlightThemeNova from "starlight-theme-nova"

// https://astro.build/config
// https://starlight.astro.build/reference/configuration/
export default defineConfig({
	integrations: [
		starlight({
			title: "Docs with Tailwind",
			plugins: [starlightLinksValidator(), starlightThemeNova()],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/withastro/starlight",
				},
			],
			sidebar: [
				{
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Example Guide", slug: "guides/example" },
					],
				},
				{
					label: "Reference",
					autogenerate: { directory: "reference" },
				},
			],
			customCss: ["./src/styles/global.css", "./src/styles/custom.css"],
		}),

		// https://starlight-mermaid-demo.netlify.app/configuration/
		mermaid({
			theme: "forest",
			autoTheme: true,
			mermaidConfig: {
				flowchart: {
					curve: "basis",
				},
			},
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
})
