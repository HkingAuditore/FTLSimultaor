/// <reference path="Page.js" />
class Block {
    // 存储容量大小
    static BUFFER_SIZE = 128;

    //Block存储所用的Page
    pages;

    // Block的编号
    num;

    // Block所在的SSD
    ssd;

    // 使用此Block的Data
    data;

    constructor(content, num = 0, data = undefined) {
        this.Write(content);
        this.num = num;
        this.data = data;
    }

    // Block写入
    Write(content) {
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
        this.Write(content);
    }

    // 比较内容
    Compare(content) {
        return content === this.Read();
    }

    //逐Page比较
    static CompareInPages(content, pages) {
        let contentStr = String(content);
        let difference = [];

        for (let i = 0; i < Block.BUFFER_SIZE / Page.PAGE_SIZE; i++) {
            if (
                contentStr.substring(
                    i * Page.PAGE_SIZE,
                    i * Page.PAGE_SIZE + Page.PAGE_SIZE
                ) !== pages[i].Read()
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

    // 读取块中当前包含Log的最新结果
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

    // 读取块中当前包含Log的最新结果(Content)
    ReadBlockPagesWithLogContent() {
        let edit = this.FindExistedEdit();
        let pages = this.pages;
        for (let i = 0; i < pages.length; i++) {
            if (edit.get(pages[i].num) !== undefined) {
                pages[i] = edit.get(pages[i].num);
            }
        }

        let str = "";
        this.pages.forEach((element) => {
            str += element.Read();
        });
        // 剔除block开头的占位数据
        while (str.length >= Data.CHAR_SIZE) {
            let tmp = parseInt(str.substring(0, Data.CHAR_SIZE), 2);
            if (tmp == 0) {
                str = str.substring(Data.CHAR_SIZE);
                continue;
            } else {
                return str;
            }
        }

        return str;
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
            tmpContent += element.Read();
        });
        return tmpContent;
    }

    //


    // 区块数据复制
    static Clone(origin, target) {
        origin.pages.forEach((element, index) => {
            Page.Clone(element, target.pages[index]);
        });
        target.data = origin.data;
        return target;
    }
}