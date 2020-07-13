/// <reference path="Page.js" />
class Block {
    // 存储容量大小
    static BUFFER_SIZE = 128;

    //Block存储所用的Page
    pages;
    num;
    ssd;

    constructor(content, num = 0) {
        this.FillPages(content);
        this.num = num;
    }

    FillPages(content) {
        let contentStr = String(content);

        // 将区块的BUFFER_SIZE空间填满
        if (contentStr.length < Block.BUFFER_SIZE) {
            contentStr = contentStr.padStart(Block.BUFFER_SIZE, "0");
        } else {
            contentStr = contentStr.substring(0, Block.BUFFER_SIZE);
        }

        // 将数据写入page
        let pgs = [];
        while (contentStr.length >= Page.PAGE_SIZE) {
            pgs.push(new Page(contentStr.substring(0, Page.PAGE_SIZE)));
            contentStr = contentStr.substring(Page.PAGE_SIZE);
        }
        this.pages = pgs;
    }

    // 修改Block内容
    Edit(content) {
        this.FillPages(content);
    }

    // 比较内容
    Compare(content) {
        return content === this.Read();
    }

    //逐Page比较
    static CompareInPages(content, pages) {
        let contentStr = String(content);
        let difference = [];
        // console.log("COUNT   :" + Block.BUFFER_SIZE / Page.PAGE_SIZE);

        for (let i = 0; i < Block.BUFFER_SIZE / Page.PAGE_SIZE; i++) {
            // console.log(
            //     "EDIT    :" +
            //     Data.BinaryToStr(
            //         contentStr.substring(
            //             i * Page.PAGE_SIZE,
            //             i * Page.PAGE_SIZE + Page.PAGE_SIZE
            //         )
            //     ) +
            //     "ORI  [" +
            //     i +
            //     "]:" +
            //     Data.BinaryToStr(this.pages[i].content) +
            //     "RESULT:" + (contentStr.substring(
            //         i * Page.PAGE_SIZE,
            //         i * Page.PAGE_SIZE + Page.PAGE_SIZE
            //     ) !== this.pages[i].content)
            // );

            if (
                contentStr.substring(
                    i * Page.PAGE_SIZE,
                    i * Page.PAGE_SIZE + Page.PAGE_SIZE
                ) != pages[i].content
            ) {
                difference.push(i);
            }
        }
        return difference;
    }

    // 寻找Block已经存入DataLog的修改
    FindExistedEdit() {
        let existed = new Map();
        for (let page of this.pages) {
            let result = this.ssd.DataLogFind(page.num);
            if (result !== undefined) {
                existed.set(page.num, result);
            }
        }
        return existed;
    }

    ReadBlockPagesWithLog() {
        let edit = this.FindExistedEdit();
        let pages = this.pages;
        for (let i = 0; i < pages.length; i++) {
            if (edit.get(pages[i].num) !== undefined) {
                pages[i] = edit.get(pages[i].num);
            }
        }

        return pages;
    }

    // 清空块
    Clean() {
        let contentStr = "";

        // 用0填满区块
        contentStr = contentStr.padStart(Block.BUFFER_SIZE, "0");

        // 将数据写入page
        let pgs = [];
        while (contentStr.length >= Page.PAGE_SIZE) {
            pgs.push(new Page(contentStr.substring(0, Page.PAGE_SIZE)));
            contentStr = contentStr.substring(Page.PAGE_SIZE);
        }
        this.pages = pgs;
    }

    // 读取块内二进制数据
    Read() {
        let tmpContent = String(this.CollectPages());

        // 剔除block开头的占位数据
        while (tmpContent.length >= Data.CHAR_SIZE) {
            let tmp = parseInt(tmpContent.substring(0, Data.CHAR_SIZE), 2);
            if (tmp == 0) {
                tmpContent = tmpContent.substring(Data.CHAR_SIZE);
                continue;
            } else {
                return tmpContent;
            }
        }
    }

    // 收集所有page中的数据
    CollectPages() {
        let tmpContent = "";
        this.pages.forEach((element) => {
            tmpContent += element.content;
        });
        return tmpContent;
    }

    // 区块数据复制
    static Clone(origin, target) {
        origin.pages.forEach((element, index) => {
            Page.Clone(element, target.pages[index]);
        });
        return target;
    }
}