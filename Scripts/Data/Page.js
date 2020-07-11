class Page {
    static PAGE_SIZE = 16;
    content;

    constructor(content) {
        var contentStr = String(content);
        if (contentStr.length < Page.PAGE_SIZE) {
            contentStr = contentStr.padStart(Page.PAGE_SIZE, "0");
        } else {
            contentStr = contentStr.substring(0, Page.PAGE_SIZE);
        }
        this.content = contentStr;

    }
}