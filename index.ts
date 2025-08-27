import { JSDOM } from "jsdom";

/**
 * - [x] fetch 해보기
 * - [x] 책 출간/업데이트 정보 가져오기
 * - [x] 해당 정보 Date로 파싱하기
 * - [x] 서로 다른 URL에서 출간/업데이트 정보 정상적으로 가져오는지 확인하기
 * - [x] 신간 리스트에서 만화책 상세 페이지 주소 가져오기
 * - [x] 신간 리스트에서 만화책 제목, 소장 가격 가져오기
 * - [x] 만화책 상세 페이지에서 기타 정보 가져오기
 */


/**
 * 만화책 정보
 * - 만화책 리스트에서 제공하는 정보
 */
interface Comic1 {
    /**
     * 만화책 상세 페이지 URL
     */
    url: string;

    /**
     * 만화책 제목
     */
    title: string;

    /**
     * 만화책 소장 가격
     */
    price: number;
}

/**
 * 리디 만화 신간 리스트에서 만화책 리스트 정보를 가져오는 함수
 */
async function getComic1List(): Promise<Comic1[]> {
    const url = "https://ridibooks.com/new-releases/comic?type=total&adult_exclude=y&page=1&order=RECENT";
    const body = await fetchBody(url);
    const document = readBody(body);

    // dom
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

    const lis = ul.querySelectorAll('li');

    // comics
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
    }, [] as Comic1[]);
    return comics;
}

const comics = await getComic1List();
// console.log({ comics });


// const url = "https://ridibooks.com/books/505098346?_rdt_sid=new_release&_rdt_idx=0&_rdt_arg=comic";
// const comic2 = await getBookInfo(url);
// console.log({ comic2 });

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

for (const comic1 of comics) {
    try {
        const comic2 = await getComic2Info(comic1.url);
        console.log({ ...comic1, ...comic2 });

    } catch (error) {
        console.error({
            comic1,
            error,
        });
    }
}

/**
 * 만화책 정보
 * - 만화책 상세 페이지에서 제공하는 정보
 */
interface Comic2 {
    /**
     * 만화책 출간/업데이트 일
     * - 출간: 단편 혹은 시리즈의 1권
     * - 업데이트: 시리즈의 후속권
     */
    date: Date;

    /**
     * 기타 정보
     * - 그림, 원작, 글,그림, 원화, 번역, 출판
     */
    subText: string;
}

/**
 * 책 정보를 가져온다.
 * - 책이 시리즈인지 단권인지 판단하여 출간/업데이트 정보를 가져온다.
 * @param url 책 URL
 */
async function getComic2Info(url: string): Promise<Comic2> {
    // fetch
    const body = await fetchBody(url);
    const document = readBody(body);

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
    }

    // subText
    const islandsHeader = document.querySelector("#ISLANDS__Header");
    if (!islandsHeader) {
        throw new Error("islandsHeader not found");
    }
    const h1 = islandsHeader.querySelector("h1");
    if (!h1) {
        throw new Error("h1 not found");
    }
    const div = h1.nextSibling?.nextSibling as HTMLElement | null | undefined;
    if (!div) {
        throw new Error("div not found");
    }
    
    const div1 = div.children[0]; // 그림, 원작, 글, 그림, 번역
    if (!div1) {
        throw new Error("div1 not found");
    }
    const lis = div1.querySelectorAll('li');
    if (lis.length === 0) {
        throw new Error("lis not found");
    }
    const subTexts = Array.from(lis).map(li => li.textContent);

    const div2 = div.children[1]; // 출판
    if (!div2) {
        throw new Error("div2 not found");
    }
    if (div2.textContent) {
        subTexts.push(div2.textContent);
    }

    // const div3 = div.children[2]; // 총 0권

    const subText = subTexts.join(" | ");

    // return
    const comic2: Comic2 = { date, subText };
    return comic2;
}


// util

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