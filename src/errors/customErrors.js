export class CustomError extends Error {
  constructor(reason, errorCode = "UNKNOWN", data = null) {
    super(reason);
    this.errorCode = errorCode;
    this.data = data;
  }
}

export class DuplicateEmailError extends CustomError {
  constructor(data) {
    super("이미 존재하는 이메일입니다.", "U001", data);
  }
}

export default CustomError;
