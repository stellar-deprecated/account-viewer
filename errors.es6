function BasicClientError(name, data) {
  this.name = name;
  this.data = data;
}
BasicClientError.prototype = Object.create(Error.prototype);
BasicClientError.prototype.constructor = BasicClientError;

export default BasicClientError;
