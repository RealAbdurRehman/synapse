export class LoadingScreen {
  private element: HTMLElement;
  private progressBar: HTMLElement;
  private percentage: HTMLElement;
  constructor() {
    this.element = document.getElementById("loader")!;
    this.progressBar = document.getElementById("loader-progress")!;
    this.percentage = document.getElementById("loader-percentage")!;
  }
  public setProgress(progress: number): void {
    const percentage = Math.round(progress * 100);
    this.progressBar.style.width = `${percentage}%`;
    this.percentage.textContent = `${percentage}%`;
  }
  public hide(): void {
    this.element.classList.add("opacity-0", "pointer-events-none");
  }
}
