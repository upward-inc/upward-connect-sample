import { prisma } from "../../libs/prisma"
import type { GetFileListQuery, GetFileListResponse } from "../../schema/file"
import { toSourceRecordJson } from "./to-source-record-json"

export const getFileList = async (
	query: GetFileListQuery,
): Promise<GetFileListResponse> => {
	const { record_entity, record_id, limit, offset } = query

	const where = {
		source_record: toSourceRecordJson(record_entity, record_id),
	}

	const [files, totalSize] = await Promise.all([
		prisma.file.findMany({
			where,
			select: { id: true, type: true },
			orderBy: { id: "asc" },
			skip: offset ?? 0,
			// `has_next_page`の効率的な算出の為、指定された件数よりも1件多く取得する
			take: limit ? limit + 1 : undefined,
		}),
		prisma.file.count({ where }),
	])

	// 余分に取得したファイルを除外
	const data = limit ? files.slice(0, limit) : files
	const hasNextPage = limit ? files.length > limit : false

	return {
		has_next_page: hasNextPage,
		total_size: totalSize,
		data,
	}
}
