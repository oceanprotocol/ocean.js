# Check if the CodeExamples.md file has been changed
original=$(md5sum CodeExamples.md)
echo $original
npm run create:guide
new=$(md5sum CodeExamples.md)
echo $new

# Check if file has changed
if [ "$new" = "$original" ]; then
    echo "CodeExamples.md file has not been changed"
else
    echo "CodeExamples.md file has been changed. Committing changes"
    # Stage the file, commit and push
    git status
    git add CodeExamples.md
    git commit -m "Updating CodeExamples.md"
    branch=${GITHUB_HEAD_REF#refs/heads/}
    echo Pushing changes to branch: ${branch}
    git push origin HEAD:${branch} --force
fi

# Check if the ComputeExamples.md file has been changed
original=$(md5sum ComputeExamples.md)
echo $original
npm run create:guidec2d
new=$(md5sum ComputeExamples.md)
echo $new

# Check if file has changed
if [ "$new" = "$original" ]; then
    echo "ComputeExamples.md file has not been changed"
else
    echo "ComputeExamples.md file has been changed. Committing changes"
    # Stage the file, commit and push
    git status
    git add ComputeExamples.md
    git commit -m "Updating ComputeExamples.md"
    branch=${GITHUB_HEAD_REF#refs/heads/}
    echo Pushing changes to branch: ${branch}
    git push origin HEAD:${branch} --force
fi