import { firstNames } from "../static/first-name"
import { lastNames } from "../static/last-name"

/**
 * 配列からランダムに1行を返却
 */
export const getAnyRow = <T>(data: readonly T[]): T => {
	return data[getRandomInteger(0, data.length - 1)] as T
}

/**
 * 数値をゼロパディングした文字列を返却
 */
export const getZeroPaddingString = (value: number, length: number) => {
	return String(value).padStart(length, "0")
}

/**
 * 最小値と最大値の間でランダムな整数を返却
 */
export const getRandomInteger = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 最小値と最大値の間でランダムな日付を返却
 */
export const getRandomDate = (start: Date, end: Date) => {
	return new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime()),
	)
}

/**
 * 指定した割合でtrueを返却
 */
export const getRandomBoolean = (probability: number) => {
	return Math.random() < probability
}

/**
 * 重複しない人物を指定した件数分返却
 */
export const getUniquePersons = (size: number) => {
	// すべての可能な組み合わせのインデックスペアを生成
	const combinations: [number, number][] = []
	for (let i = 0; i < firstNames.length; i++) {
		for (let j = 0; j < lastNames.length; j++) {
			combinations.push([i, j])
		}
	}

	// 組み合わせをシャッフル
	for (let i = combinations.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[combinations[i], combinations[j]] = [combinations[j], combinations[i]]
	}

	// 必要な数だけ取得
	const result: {
		firstName: Omit<(typeof firstNames)[number], "gender">
		lastName: (typeof lastNames)[number]
		gender: (typeof firstNames)[number]["gender"]
	}[] = []
	const maxSize = Math.min(size, combinations.length)
	const uniqueKeys = new Set<string>()

	for (let i = 0; i < combinations.length && result.length < maxSize; i++) {
		const firstNameIdx = combinations[i]?.[0]
		const lastNameIdx = combinations[i]?.[1]
		const firstName = firstNameIdx ? firstNames[firstNameIdx] : undefined
		const lastName = lastNameIdx ? lastNames[lastNameIdx] : undefined

		if (firstName && lastName) {
			const key = `${firstName.roman}-${lastName.roman}`
			const { gender, ...firstNameWithoutGender } = firstName
			if (!uniqueKeys.has(key)) {
				uniqueKeys.add(key)
				result.push({
					firstName: firstNameWithoutGender,
					lastName: lastName,
					gender: firstName.gender,
				})
			}
		}
	}

	return result
}

/**
 * 配列から指定したキーによる重複を除外
 */
export const distinctBy = <T extends { [key: string]: unknown }>(
	array: T[],
	getKeyValue: (cur: T) => unknown,
) => {
	const resultMap = new Map<unknown, T>()
	for (const item of array) {
		const keyValue = getKeyValue(item)
		if (!resultMap.get(keyValue)) {
			resultMap.set(keyValue, item)
		}
	}
	return [...resultMap.values()]
}
