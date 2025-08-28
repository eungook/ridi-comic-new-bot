import { JSDOM } from "jsdom";

/**
 * - [x] fetch 해보기
 * - [x] 책 출간/업데이트 정보 가져오기
 * - [x] 해당 정보 Date로 파싱하기
 * - [x] 서로 다른 URL에서 출간/업데이트 정보 정상적으로 가져오는지 확인하기
 * - [x] 신간 리스트에서 만화책 상세 페이지 주소 가져오기
 * - [x] 신간 리스트에서 만화책 제목, 소장 가격 가져오기
 * - [x] 만화책 상세 페이지에서 기타 정보 가져오기
 * - [x] 신간 리스트의 <script id="__NEXT_DATA__">의 JSON에서 만화책 정보 가져오기
 * - [x] 신간 리스트에서 만화책 정보 가져오기 개선
 * - [x] 오늘 출간된 만화책 정보만 가져오기
 */


// types

/**
 * 만화책 정보
 * - 만화책 리스트에서 제공하는 정보
 */
interface Comic1 {
    /**
     * 만화책 id
     */
    id: number;

    /**
     * 만화책 제목
     */
    title: string;

    /**
     * 만화책 소장 가격
     * - 최종 할인 가격 기준
     */
    price: number;
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
 * 만화책 정보
 * - 만화책 리스트와 상세 페이지에서 제공하는 정보를 합친 정보
 */
type Comic = Comic1 & Comic2;


// main
const comicList = await getNewComicList();
console.log({ comicList });


// functions

/**
 * 리디 만화 신간 리스트와 그 상세 페이지에서 제공하는 만화책 정보를 가져오는 함수
 * - 오늘 출간된 만화책 정보를 가져온다.
 */
async function getNewComicList(): Promise<Comic[]> {
    const comicList: Comic[] = [];

    // 오늘 날짜 설정
    // - KST, GMT+9 기준
    const today = new Date();
    console.log(`[${new Date().toISOString()}][getNewComicList] today=${today.toISOString()}`);
    const timezoneOffset = today.getTimezoneOffset() + (9 * 60); // note: 한국 시간 기준으로 설정
    console.log(`[${new Date().toISOString()}][getNewComicList] timezoneOffset=${timezoneOffset}`);
    today.setMinutes(today.getMinutes() + timezoneOffset);
    console.log(`[${new Date().toISOString()}][getNewComicList] today=${today.toISOString()}`);
    today.setHours(0, 0, 0, 0); // 오전 0시로 설정
    console.log(`[${new Date().toISOString()}][getNewComicList] today=${today.toISOString()}`);

    const comic1List = (await getComic1List()).slice(0, 30); // note: prefetch된 데이터는 최대 60개-> 안전을 위해 30개로 제한
    for (const comic1 of comic1List) { // note: 동기적으로 처리하기 위해 for-of 사용 // 비동기적으로 처리하면 해당 서버에 문제가 생길 수 있고, 최악의 경우 차단당할 수도 있다.
        const url = `https://ridibooks.com/books/${comic1.id}`;
        const comic2 = await getComic2Info(url);
        
        const isToday = today.getTime() === comic2.date.getTime();
        console.log(`[${new Date().toISOString()}][getNewComicList] comic2.date=${comic2.date.toISOString()}, isToday=${isToday}`);

        if (isToday) {
            const comic: Comic = { ...comic1, ...comic2 };
            comicList.push(comic);

        } else {
            console.log(`[${new Date().toISOString()}][getNewComicList] break`);
            break; // note: 오늘 출간된 만화책 정보만 가져오기 위해 오늘 이후의 만화책 정보는 가져오지 않는다.
        }
    }
    
    return comicList;
}



/**
 * 리디 만화 신간 리스트에서 만화책 리스트 정보를 가져오는 함수
 */
async function getComic1List(): Promise<Comic1[]> {
    const url = "https://ridibooks.com/new-releases/comic?type=total&adult_exclude=y&page=1&order=RECENT";
    const body = await fetchBody(url);
    const document = readBody(body);

    // <script id="__NEXT_DATA__">
    // - 여기에 React Query의 prefetch된 데이터가 있다.
    // - 이 데이터를 파싱하여 만화책 정보를 가져온다.
    const nextData = document.querySelector("#__NEXT_DATA__");
    if (!nextData) {
        throw new Error("nextData not found");
    }
    const jsonRaw = nextData.textContent;
    if (!jsonRaw) {
        throw new Error("jsonRaw not found");
    }
    const json = JSON.parse(jsonRaw);
    const items = json.props.pageProps.dehydratedState.queries[0].state.data.newReleases.items;

    // 만화책 정보 가져오기
    const comic1List: Comic1[] = items.map((item: any) => ({
        id: item.bookShell.book.id as number,
        title: item.bookShell.book.title.main as string,
        price: item.bookShell.book.priceInfo.purchase.sellingPrice as number,
    }));

    return comic1List;
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


// utils

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
    console.log(`[${new Date().toISOString()}][fetchBody] url=${url}, isWaiting=${isWaiting}`);

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