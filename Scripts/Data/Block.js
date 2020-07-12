/// <reference path="Page.js" />
class Block {
    // 存储容量大小
    static BUFFER_SIZE = 128;

    //Block存储所用的Page
    pages;

    constructor(content) {
        this.FillPages(content);
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
        FillPages(content);
    }

    // 比较内容
    Compare(content) {
        return content === this.Read();
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

    static Clone(origin, target) {
        origin.pages.forEach((element, index) => {
            Page.Clone(element, target.pages[index]);
        });
        return target;
    }
}