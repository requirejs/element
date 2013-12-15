define({
  _model: null,
  get model() {
    return this._model;
  },
  set model(model) {
    this._model = model;
    if (typeof this.template === 'function') {
      this.appendChild(this.template(this));
    }
  }
});
