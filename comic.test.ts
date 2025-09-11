import { describe, test, expect } from "bun:test";
import * as comic from "./comic.ts";

test("getNewComicList", async () => {
    const comicList = await comic.getNewComicList();
    expect(comicList).toBeDefined();
    console.log({
        comicList,
    });
});

test("getComic2Info", async () => {
    const url = "https://ridibooks.com/books/806017266";
    const comic2 = await comic.getComic2Info(url);
    expect(comic2).toBeDefined();
    console.log({
        comic2,
    });
});