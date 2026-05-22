import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"
// @ts-check
import { defineConfig } from "astro/config"
import mermaid from "astro-mermaid"
import starlightLinksValidator from "starlight-links-validator"
import starlightThemeNova from "starlight-theme-nova"

// https://astro.build/config
// https://starlight.astro.build/reference/configuration/
export default defineConfig({
	integrations: [
		starlight({
			plugins: [starlightLinksValidator(), starlightThemeNova()],
			customCss: ["./src/styles/global.css", "./src/styles/custom.css"],
			title: "UPWARD CONNECT構築ガイド",
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/upward-inc/upward-connect-sample",
				},
			],
			sidebar: [
				{
					label: "はじめに",
					items: [
						{
							label: "UPWARD CONNECTについて",
							link: "/intro",
							badge: { text: "WIP", variant: "caution" },
						},
						{
							label: "用語集",
							link: "/glossary",
							badge: { text: "WIP", variant: "caution" },
						},
					],
				},
				{
					label: "認証・認可API",
					items: [
						{
							label: "認証・認可の実装ガイド",
							link: "auth-api/guide",
						},
						{
							label: "API仕様",
							items: [{ autogenerate: { directory: "auth-api/spec" } }],
						},
					],
				},
				{
					label: "リソースAPI",
					items: [
						{
							label: "API仕様 - メタデータ操作",
							items: [
								{ autogenerate: { directory: "resource-api/spec-metadata" } },
							],
						},
						{
							label: "API仕様 - レコード操作",
							items: [
								{ autogenerate: { directory: "resource-api/spec-record" } },
							],
						},
						{
							label: "API仕様 - その他",
							items: [
								{ autogenerate: { directory: "resource-api/spec-other" } },
							],
						},
					],
				},
				{
					label: "ジオコーディングAPI",
					items: [
						{
							label: "API仕様",
							items: [{ autogenerate: { directory: "geocoding/spec" } }],
						},
					],
				},
			],
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
