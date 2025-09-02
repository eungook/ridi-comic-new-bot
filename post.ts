/**
 * 블루스카이 포스팅 관련 코드
 */

import { AtpAgent } from "@atproto/api";
import sharp from "sharp";
import * as comic from "./comic.js";


// main
main();


// functions

/**
 * 메인 함수
 * - 엔트리 포인트
 */
async function main() {
    // fetch
    const comicList = await comic.getNewComicList();
    console.log(`[${new Date().toISOString()}][posting] comicList=${comicList.length}`);

    // Create a Bluesky Agent
    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    // Login
    const opts = {
        identifier: process.env.BLUESKY_USERNAME!,
        password: process.env.BLUESKY_PASSWORD!,
    };
    await agent.login(opts);
    console.log(`[${new Date().toISOString()}][posting] logged in`);

    // posting
    for (const comic of comicList) {
        await posting(agent, comic);
    }
    console.log(`[${new Date().toISOString()}][posting] done`);

    // Logout
    await agent.logout();
    console.log(`[${new Date().toISOString()}][posting] logged out`);
}


/**
 * 만화 신간 정보를 포스팅하는 함수
 */
async function posting(agent: AtpAgent, comic: comic.Comic) {
    console.log(`[${new Date().toISOString()}][posting] comic=${comic.title}, start`);

    // 썸네일 업로드
    const thumb = await makeThumb(comic.id);
    const blob = await agent.uploadBlob(thumb);
    console.log(`[${new Date().toISOString()}][posting] comic=${comic.title}, thumb uploaded`);

    // 포스팅
    await agent.post({
        text: `《${comic.title}》\n${comic.subText} | ${formatNumber(comic.price)}원`,
        embed: {
            $type: 'app.bsky.embed.external',
            external: {
                uri: `https://ridibooks.com/books/${comic.id}`,
                title: comic.title,
                description: '', // description은 없으면 알아서 해당 영역이 감춰진다
                thumb: blob.data.blob,
            },
        },
    });
    console.log(`[${new Date().toISOString()}][posting] comic=${comic.title}, posted`);

    await wait(1); // 차단을 피하기 위해
}

/**
 * 링크 카드를 위한 썸네일을 만든다.
 * - 위아래를 살짝 잘라내고, 좌우에 여백을 넣는다.
 */
async function makeThumb(id: number): Promise<Buffer<ArrayBufferLike>> {
    const url = `https://img.ridicdn.net/cover/${id}/xxlarge?dpi=xhdpi#1`;
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // note: 세로로 긴 이미지의 위아래를 약간 잘라내고, 좌우에 여백을 두려고 함
    const resized1 = await sharp(buffer)
        .resize({
            width: 310 * 2,
            height: 270 * 2,
        })
        .toBuffer();
    
    // note: resize는 chaining으로 하면 한 번만 적용된다. 그래서 굳이 buffer로 만들어 두 번 해야 한다.
    const resized2 = await sharp(resized1)
        .resize({
            width: 514 * 2,
            height: 270 * 2,
            fit: 'contain',
            background: '#FFF',
        })
        .toBuffer();

    return resized2;
}


// utils

/**
 * {@link second}초 만큼 대기합니다.
 */
function wait(second: number) {
    const ms = second * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 숫자를 3자리로 포맷팅한다.
 * - 예: 1234-> 1,234
 */
function formatNumber(number: number) {
    return number.toLocaleString('ko-KR');
}