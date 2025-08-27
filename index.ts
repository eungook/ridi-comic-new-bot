/**
 * - [x] fetch 해보기
 * - [ ] 책 출간/업데이트 정보 가져오기
 * - [ ] 해당 정보 Date로 파싱하기
 */


const url = "https://ridibooks.com/books/505098346?_rdt_sid=new_release&_rdt_idx=0&_rdt_arg=comic";
const body = await fetchBody(url);
console.log({ body: body.slice(0, 1000) });


/**
 * 해당 URL의 body를 반환한다.
 * @param isWaiting 대기 여부 (기본값: true)
 */
export async function fetchBody(url: string, isWaiting = true) {
    const response = await fetch(url);
    if (isWaiting) { await wait(1); } // 차단을 피하기 위해

    const data = await response.text();
    return data;
}

/**
 * {@link second}초 만큼 대기합니다.
 */
export function wait(second: number) {
    const ms = second * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}