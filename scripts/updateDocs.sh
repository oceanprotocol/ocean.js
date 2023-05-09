# Create updated documentation
npm run docs

# Stage the file, commit and push
git status
git add ./docs
git commit -m "Updating documentation"
branch=${GITHUB_HEAD_REF#refs/heads/}
echo Pushing changes to branch: ${branch}
git push origin HEAD:${branch} --force