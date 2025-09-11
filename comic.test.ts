import { describe, test, expect } from "bun:test";
import * as comic from "./comic.ts";

describe("getComic2Info", async () => {
    test("series", async () => {
        const url = "https://ridibooks.com/books/806017266";
        const comic2 = await comic.getComic2Info(url);
        expect(comic2).toBeDefined();
        console.log({
            comic2,
        });
    });
    test("series (2)", async () => {
        const url = "https://ridibooks.com/books/1019108367";
        const comic2 = await comic.getComic2Info(url);
        expect(comic2).toBeDefined();
        console.log({
            comic2,
        });
    });
    test("single", async () => {
        const url = "https://ridibooks.com/books/1019108359";
        const comic2 = await comic.getComic2Info(url);
        expect(comic2).toBeDefined();
        console.log({
            comic2,
        });
    });
});

test("getNewComicList", async () => {
    const comicList = await comic.getNewComicList();
    expect(comicList).toBeDefined();
    console.log({
        comicList,
    });
}, 2 * 60 * 1000); // 2분