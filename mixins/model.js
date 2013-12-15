define({
  _model: null,
  get model() {
    return this._model;
  },
  set model(model) {
    this._model = model;
    this.modelChangedCallback();
  },

  /**
   * A multiplexed callback mixin, so that other mixins
   * can implement a callback that gets called when the
   * model changes.
   */
  modelChangedCallback: function () {
    if (!this._modelInit) {
      this._modelInit = true;
      if (typeof this.template === 'function') {
        this.appendChild(this.template(this));
      }
    }
  }
});
