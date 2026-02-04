import type { Prisma, user } from "@prisma/client"
import { getAnyRow } from "./utility"

const UPWARD_LOGO_PATH = `${import.meta.dir}/static/upward.png`
const UPWARD_LOGO_FILE = Bun.file(UPWARD_LOGO_PATH)

export async function seedFiles(
	prisma: Prisma.TransactionClient,
	users: user[],
) {
	const user = getAnyRow(users)

	const files: Prisma.fileCreateManyInput[] = [
		{
			name: "upward.png",
			type: "image/png",
			content: Buffer.from(await UPWARD_LOGO_FILE.arrayBuffer()),
			created_by: user.id,
			modified_by: user.id,
		},
	]

	const records = await prisma.file.createMany({ data: files })

	console.info(`>> file records created: ${records.count}`)

	return records
}
