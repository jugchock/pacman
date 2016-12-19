import { PacmanPage } from './app.po';

describe('pacman App', function() {
  let page: PacmanPage;

  beforeEach(() => {
    page = new PacmanPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
