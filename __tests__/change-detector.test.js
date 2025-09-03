

/* TEST_FOR: getGitDiff */
/* TEST_FOR: getGitDiff */
import { getGitDiff } from 'change-detector';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('getGitDiff', () => {
  test('Should return diffs for modified and untracked files', async () => {
    const prevCommit = '';
    const currCommit = '';
    const options = {};
    const cwd = process.cwd();
    const workingChanges = true;
    const filePathA = 'fileA';
    const filePathB = 'fileB';

    execSync(`touch ${filePathA}`, { cwd });
    fs.writeFileSync(path.join(cwd, filePathB), 'content', 'utf8');

    try {
      execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
      await getGitDiff(prevCommit, currCommit, options);
    } finally {
      fs.unlinkSync(path.join(cwd, filePathA));
      fs.unlinkSync(path.join(cwd, filePathB));
    }
  });
});
``` 


/* TEST_FOR: mutation */
```
/* TEST_FOR: getGitDiff */
import { getGitDiff } from 'change-detector';

describe('getGitDiff', () => {
  it('Should return diffs for modified files in case of no change to tracked file', async () => {
    const prevCommit = '';
    const currCommit = '';
    const options = {};
    const cwd = process.cwd();
    const workingChanges = true;
    const filePathA = 'fileA';
    const filePathB = 'fileB';

    execSync(`touch ${filePathA}`, { cwd });
    fs.writeFileSync(path.join(cwd, filePathB), 'content', 'utf8');

    try {
      // No changes to tracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({});
      
      execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
      fs.writeFileSync(path.join(cwd, filePathB), 'updated content', 'utf8');
      // No changes to tracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({});
      
      fs.unlinkSync(path.join(cwd, filePathA));
      fs.writeFileSync(path.join(cwd, filePathB), 'content', 'utf8');
      // Changes to tracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: ['fileA'],
        untracked: [],
      });
      
      execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
      fs.writeFileSync(path.join(cwd, filePathB), 'updated content', 'utf8');
      // Changes to tracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: ['fileB'],
        untracked: [],
      });
      
      fs.unlinkSync(path.join(cwd, filePathA));
      // Untracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: [],
        untracked: ['fileB'],
      });
      
      fs.writeFileSync(path.join(cwd, 'untracked-file'), 'content', 'utf8');
      // Untracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: [],
        untracked: ['fileB'],
      });
      
      execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
      // Untracked files
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: ['fileB'],
        untracked: ['untracked-file'],
      });
      
      fs.writeFileSync(path.join(cwd, 'untracked-file'), 'updated content', 'utf8');
      // Untracked files with changes
      expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
        modified: ['fileB'],
        untracked: ['untracked-file'],
      });
    } finally {
      fs.unlinkSync(path.join(cwd, filePathA));
      fs.unlinkSync(path.join(cwd, 'untracked-file'));
    }
  });
});
```

/* TEST_FOR: mutation */
it('Should return diffs for modified and untracked files in case of mutations', async () => {
  const prevCommit = '';
  const currCommit = '';
  const options = {};
  const cwd = process.cwd();
  const workingChanges = true;
  const filePathA = 'fileA';
  const filePathB = 'fileB';
  
  execSync(`touch ${filePathA}`, { cwd });
  fs.writeFileSync(path.join(cwd, filePathB), 'content', 'utf8');
  
  try {
    // No changes to tracked files
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({});
    
    execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
    fs.writeFileSync(path.join(cwd, filePathB), 'updated content', 'utf8');
    // Changes to tracked files
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
      modified: ['fileA'],
      untracked: [],
    });
    
    fs.unlinkSync(path.join(cwd, filePathA));
    // Untracked files
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
      modified: [],
      untracked: ['fileB'],
    });
    
    fs.writeFileSync(path.join(cwd, 'untracked-file'), 'content', 'utf8');
    // Untracked files
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
      modified: [],
      untracked: ['fileB'],
    });
    
    execSync(`git -C ${cwd} add .`, { stdio: 'ignore' });
    // Untracked files
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
      modified: ['fileB'],
      untracked: ['untracked-file'],
    });
    
    fs.writeFileSync(path.join(cwd, 'untracked-file'), 'updated content', 'utf8');
    // Untracked files with changes
    expect(await getGitDiff(prevCommit, currCommit, options)).toMatchObject({
      modified: ['fileB'],
      untracked: ['untracked-file'],
    });
  } finally {
    fs.unlinkSync(path.join(cwd, filePathA));
    fs.unlinkSync(path.join(cwd, 'untracked-file'));
  }
});
``` 
