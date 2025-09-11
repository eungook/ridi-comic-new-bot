import { JSDOM } from "jsdom";


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
export type Comic = Comic1 & Comic2;


// functions

/**
 * 리디 만화 신간 리스트와 그 상세 페이지에서 제공하는 만화책 정보를 가져오는 함수
 * - 오늘 출간된 만화책 정보를 가져온다.
 */
export async function getNewComicList(): Promise<Comic[]> {
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
        
        const isPast = comic2.date.getTime() < today.getTime(); // note: 출간 정보의 출간일이, 리디북스의 등록일보다 느린 경우가 있다. // 예: https://ridibooks.com/books/371003637 (출간일: 2025.09.05, 실제 등록일: 2025.09.02)
        console.log(`[${new Date().toISOString()}][getNewComicList] comic2.date=${comic2.date.toISOString()}, isPast=${isPast}`);

        if (isPast) { // 오늘 이전의 만화책 정보는 가져오지 않는다.
            console.log(`[${new Date().toISOString()}][getNewComicList] break`);
            break;
            
        } else {
            const comic: Comic = { ...comic1, ...comic2 };
            comicList.push(comic);
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
export async function getComic2Info(url: string): Promise<Comic2> {
    // fetch
    const body = await fetchBody(url);
    const document = readBody(body);

    // parse
    // <script id="ISLANDS__PreparedData">
    // - 여기에 React Query의 prefetch된 데이터가 있다.
    // - 이 데이터를 파싱하여 만화책 정보를 가져온다.
    const preparedData = document.querySelector("#ISLANDS__PreparedData");
    if (!preparedData) {
        throw new Error("preparedData not found");
    }
    const jsonRaw = preparedData.textContent;
    if (!jsonRaw) {
        throw new Error("jsonRaw not found");
    }
    const json = JSON.parse(jsonRaw);
    const cells = json.props.gridQuery.riGrid.grid.cells;
    if (cells.length === 0) {
        throw new Error("cells not found");
    }

    // date
    let date: Date | null = null;
    const div = document.querySelector("#SeriesListWrap");
    const isSeries = Boolean(div);
    console.log(`[${new Date().toISOString()}][getComic2Info] url=${url}, isSeries=${isSeries}`);
    if (div) {
        // note: 시리즈가 있는 경우, 리스트의 가장 마지막, 최신 권의 정보를 가져온다.
        // 참고: preparedData의 BookDetailHomeEpisodeBookList에는 모든 리스트가 들어있지 않다. 그래서 직접 div#SeriesListWrap에서 가져와야 한다.
        const lis = div.querySelectorAll("li.js_series_book_list");
        if (lis.length === 0) {
            throw new Error("lis not found");
        }
        const newestBook = lis[lis.length - 1];
        if (!newestBook) {
            throw new Error("newestBook not found");
        }
        const li = newestBook.querySelector("li.info_reg_date") as HTMLElement | null;
        if (!li) {
            throw new Error("li not found");
        }
        const textContent = li.textContent;
        if (!textContent) {
            throw new Error("textContent not found");
        }
        date = new Date(textContent.replaceAll(/[^0-9.]/g, "")); // 형식: yyyy.mm.dd. // 참고: yyyy.mm.dd. 형식이면 GMT 기준 0시로 처리된다. // 참고: 여기의 등록일이 metadata의 출간 정보보다 더 정확하다.
        
    } else {
        // note: 시리즈가 없는 단권일 경우, metadata 정보에서 출간 정보를 가져온다.
        const metadata = cells.find((item: any) => (item.type === "BookDetailHomeMetadata"));
        if (!metadata) {
            throw new Error("metadata not found");
        }
        date = new Date(metadata.cell__BookDetailHomeMetadata.publishInfo[0].pubDate); // 형식: yyyy.mm.dd. // 참고: yyyy.mm.dd. 형식이면 GMT 기준 0시로 처리된다.
    }
    if (date && isNaN(date.getTime())) {
        throw new Error("date is invalid");
    }

    // subText
    const header = cells.find((item: any) => (item.type === "BookDetailHomeHeader")); // note: 만화책 헤더 정보
    if (!header) {
        throw new Error("header not found");
    }
    const information = header.cell__BookDetailHomeHeader.information;
    if (!information) {
        throw new Error("information not found");
    }
    const publisherName = information.publisherName;
    if (!publisherName) {
        throw new Error("publisherName not found");
    }
    const authorGroups = information.authorGroups;
    if (authorGroups.length === 0) {
        throw new Error("authorGroups not found");
    }
    const subText = [...authorGroups.map((item: any) => {
        const name = item.authors[0].name;
        const title = item.title;
        return `${name} ${title}`;
    }),`${publisherName} 출판`].join(" | ");

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