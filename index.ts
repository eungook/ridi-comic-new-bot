import { JSDOM } from "jsdom";

/**
 * - [x] fetch 해보기
 * - [x] 책 출간/업데이트 정보 가져오기
 * - [x] 해당 정보 Date로 파싱하기
 * - [x] 서로 다른 URL에서 출간/업데이트 정보 정상적으로 가져오는지 확인하기
 * - [x] 신간 리스트에서 만화책 상세 페이지 주소 가져오기
 * - [x] 신간 리스트에서 만화책 제목, 소장 가격 가져오기
 */

const url = "https://ridibooks.com/new-releases/comic?type=total&adult_exclude=y&page=1&order=RECENT";

const body = await fetchBody(url);
const document = readBody(body);
// console.log({
//     "document.body.innerHTML": document.body.innerHTML.slice(0, 10000),
// });

const main = document.querySelector('main');
if (!main) {
    throw new Error("main not found");
}

const section = main.children[0];
if (!section) {
    throw new Error("section not found");
}

const ul = section.children[3];
if (!ul) {
    throw new Error("ul not found");
}

interface Comic {
    url: string;
    title: string;
    price: number;
}

const lis = ul.querySelectorAll('li');
const comics = Array.from(lis).reduce((comics, li) => {
    const as = li.querySelectorAll('a');
    if (as.length === 0) { return comics; } // early return

    // url, title
    const a = as[1];
    if (!a || !a.href || !a.textContent) { return comics; } // early return
    const url = `https://ridibooks.com${a.href}`;
    const title = a.textContent;

    // price
    const ps = li.querySelectorAll('p');
    if (ps.length === 0) { return comics; } // early return
    const pLast = ps[ps.length - 1]; // 참고: <p>들에는 책 설명과 대여 가격 정보, 소장 가격 정보가 있다. 그리고 맨 마지막에 소장 가격 정보가 있다.
    if (!pLast || !pLast.textContent) { return comics; } // early return

    const textContent1 = pLast.textContent.split("원")[0] ?? ''; // 참고: 소장 4,050원전권 소장 20,250원(10%)22,500원-> 소장 4,050
    const textContent2 = textContent1.split(" ")[1] ?? ''; // 참고: 소장 4,050-> 4,050
    const price = parseInt(textContent2.replace(/,/g, '')); // 참고: 소장 4,050원 -> 4050

    comics.push({ url, title, price });
    return comics;
}, [] as Comic[]);
console.log({ comics });

// const url = "https://ridibooks.com/books/505098346?_rdt_sid=new_release&_rdt_idx=0&_rdt_arg=comic";
// const urls = [
//     'https://ridibooks.com/books/505098346?_rdt_sid=new_release&_rdt_idx=0&_rdt_arg=comic',
//     'https://ridibooks.com/books/505098234?_rdt_sid=new_release&_rdt_idx=1&_rdt_arg=comic',
//     'https://ridibooks.com/books/297083309?_rdt_sid=new_release&_rdt_idx=2&_rdt_arg=comic',
//     'https://ridibooks.com/books/1690004072?_rdt_sid=new_release&_rdt_idx=3&_rdt_arg=comic',
//     'https://ridibooks.com/books/845051579?_rdt_sid=new_release&_rdt_idx=4&_rdt_arg=comic',
//     'https://ridibooks.com/books/4239000252?_rdt_sid=new_release&_rdt_idx=5&_rdt_arg=comic',
//     'https://ridibooks.com/books/505098248?_rdt_sid=new_release&_rdt_idx=6&_rdt_arg=comic',
//     'https://ridibooks.com/books/678027443?_rdt_sid=new_release&_rdt_idx=7&_rdt_arg=comic',
//     'https://ridibooks.com/books/806017187?_rdt_sid=new_release&_rdt_idx=8&_rdt_arg=comic',
//     'https://ridibooks.com/books/806017185?_rdt_sid=new_release&_rdt_idx=9&_rdt_arg=comic',
//     'https://ridibooks.com/books/806017188?_rdt_sid=new_release&_rdt_idx=10&_rdt_arg=comic',
// ]

// for (const url of urls) {
//     try {
//         await getBookInfo(url);

//     } catch (error) {
//         console.error({
//             url,
//             error,
//         });
//     }
// }

/**
 * 책 정보를 가져온다.
 * - 책이 시리즈인지 단권인지 판단하여 출간/업데이트 정보를 가져온다.
 * @param url 책 URL
 */
async function getBookInfo(url: string) {
    // fetch
    const body = await fetchBody(url);
    const document = readBody(body);

    // title
    const documentTitle = document.title;
    const title = documentTitle.split("-")[0]?.trim();

    // date
    let date: Date | null = null;
    const islandsMetadata = document.querySelector("#ISLANDS__Metadata");
    if (!islandsMetadata) {
        throw new Error("islandsMetadata not found");
    }
    
    // <time>: 업데이트 정보
    const time = islandsMetadata.querySelector("time");
    if (time) {
        // 시리즈 후속권: 업데이트 정보가 있음
        const datetime = time.getAttribute("datetime");
        if (!datetime) {
            throw new Error("datetime not found");
        }
        
        date = new Date(datetime); // 형식: yyyy-mm-dd
        date.setHours(0); // 참고: yyyy-mm-dd 형식이면 UTC 기준 0시로 처리된다. 즉 GMT+9라면 오전 9시로 처리된다. 그래서 setHours(0)으로 후처리한다.
        
        console.log({
            title,
            date,
        });

    } else {
        // 시리즈 첫 권, 혹은 단권: 업데이트 정보가 없음
        // - 대신 출간 정보가 있음
        const li = islandsMetadata.querySelector('li'); // DOM 트리의 첫번째 li: 출간 정보
        if (!li) {
            throw new Error("li not found");
        }

        const textContent = li.textContent;
        if (!textContent) {
            throw new Error("textContent not found");
        }

        const textContent2 = textContent.split(" ")[0];
        if (!textContent2) {
            throw new Error("textContent2 not found");
        }

        date = new Date(textContent2); // 형식: yyyy.mm.dd // 참고: yyyy.mm.dd 형식이면 GMT 기준 0시로 처리된다.
        
        console.log({
            title,
            date,
        });
    }
}




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