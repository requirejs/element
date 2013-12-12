define({
  _model: null,
  get model() {
    return this._model;
  },
  set model(model) {
    this._model = model;
    if (this.template && this.template.fn) {
      this.appendChild(this.template.fn(this));
    }
  }
});
