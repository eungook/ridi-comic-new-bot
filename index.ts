import { JSDOM } from "jsdom";

/**
 * - [x] fetch 해보기
 * - [x] 책 출간/업데이트 정보 가져오기
 * - [x] 해당 정보 Date로 파싱하기
 */


const url = "https://ridibooks.com/books/505098346?_rdt_sid=new_release&_rdt_idx=0&_rdt_arg=comic";
const body = await fetchBody(url);
// console.log({ body: body.slice(0, 10000) });

const document = readBody(body);
// console.log({
//     "document.title": document.title,
//     "document.body": document.body.innerHTML,
//     // "리디 접속이 원활하지 않습니다." 라는 메세지가 p#access_check에 출력되지만, 이하 내용은 정상적으로 출력되는 것 같다.
// });

const islandsMetadata = document.querySelector("#ISLANDS__Metadata");
if (!islandsMetadata) {
    throw new Error("islandsMetadata not found");
}

const time = islandsMetadata.querySelector("time");
if (!time) {
    throw new Error("time not found");
}

const datetime = time.getAttribute("datetime");
if (!datetime) {
    throw new Error("datetime not found");
}

const date = new Date(datetime);
console.log({ date });



/**
 * html 내용을 읽어 {@link JSDOM}의 document 객체를 반환한다.
 */
export function readBody(body: string) {
    const dom = new JSDOM(body);
    const { window } = dom;
    const { document } = window;
    return document;
}

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