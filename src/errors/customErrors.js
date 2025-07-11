class CustomError extends Error {
    constructor(reason, errorCode = "UNKNOWN", data = null) {
      super(reason);
      this.errorCode = errorCode;
      this.data = data;
    }
  }
  
  class DuplicateEmailError extends CustomError {
    constructor(data) {
      super("이미 존재하는 이메일입니다.", "U001", data);
    }
  }
  
  module.exports = {
    CustomError,
    DuplicateEmailError,
  };