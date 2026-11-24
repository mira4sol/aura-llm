module.exports = {
  Paths: {
    document: { uri: 'file:///mock-docs' },
    cache: { uri: 'file:///mock-cache' },
    availableDiskSpace: 64 * 1024 * 1024 * 1024,
    totalDiskSpace: 256 * 1024 * 1024 * 1024,
  },
  Directory: class Directory {
    constructor(uri) {
      this.uri = uri;
      this.exists = true;
    }
    create() {}
    list() {
      return [];
    }
  },
  File: class File {
    constructor(uri) {
      this.uri = uri;
      this.exists = false;
      this.size = 0;
    }
    delete() {}
  },
};
