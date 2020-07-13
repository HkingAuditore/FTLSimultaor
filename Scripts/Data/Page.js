class Page {
    static PAGE_SIZE = 16;

    num;
    content;

    constructor(content, num = 0) {
        var contentStr = String(content);
        if (contentStr.length < Page.PAGE_SIZE) {
            contentStr = contentStr.padStart(Page.PAGE_SIZE, "0");
        } else {
            contentStr = contentStr.substring(0, Page.PAGE_SIZE);
        }
        this.content = contentStr;
        this.num = num;
    }

    // 写入
    Write(content) {
        this.content = content;
    }


    // Page级别的数据复制
    static Clone(origin, target) {
        target.content = origin.content;
        return target;
    }
}