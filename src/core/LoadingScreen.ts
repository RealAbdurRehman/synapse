export class LoadingScreen {
  private readonly element = document.getElementById("loader")!;
  private readonly status = document.getElementById("loader-status")!;
  private readonly loadingText = document.getElementById("loading-text")!;
  public setProgress(url: string, progress: number): void {
    const percentage = Math.round(progress * 100);
    this.status.textContent = `Loading... ${percentage}%`;
    this.loadingText.textContent = url;
  }
  public hide(): void {
    setTimeout(() => {
      this.element.classList.remove("opacity-100");
      this.element.classList.add("opacity-0");
    }, 150);

    setTimeout(() => this.element.classList.add("hidden"), 850);
  }
}
