import { describe, expect, it } from "vitest"
import config from "../../../staticwebapp.config.json"

// リポジトリルートの staticwebapp.config.json は call_frontend_build.yml の Build ステップで frontend と docs の両方の dist にコピーされ、配信設定になる
describe("staticwebapp.config.json", () => {
	it("全応答に検索エンジンの索引を断るヘッダーを付けること", () => {
		// Assert
		expect(config.globalHeaders["X-Robots-Tag"]).toBe("noindex, nofollow")
	})
})
